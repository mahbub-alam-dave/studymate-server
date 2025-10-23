const express = require('express');
const router = express.Router();
const SSLCommerzPayment = require('sslcommerz-lts');
const { ObjectId } = require('mongodb');

// SSLCommerz Configuration
const store_id = process.env.SSLCOMMERZ_STORE_ID;
const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD;
const is_live = false; // true for production, false for sandbox

const { client } = require("../db/dbConnect");
const db = client.db("StudyMate");
const usersCollection = db.collection("users");
const bookingsCollection = db.collection("bookings");

function calculateBookingPrice(tutor, sessionType, duration) {
  const sessionConfig = tutor.sessions[sessionType];
  console.log(sessionConfig, sessionType)
  const basePrice = sessionConfig.fee;

  const durationMap = {
    // Personal coaching (weekly basis)
    '1week': 1,
    '2weeks': 2,
    '1month': 4,
    '2months': 8,
    
    // Batch coaching (monthly basis)
    // Already monthly, so multiply by number of months
  };

  let multiplier = 1;

  if (sessionType === 'personal') {
    multiplier = durationMap[duration] || 1;
  } else if (sessionType === 'batch') {
    // For batch, duration is in months
    if (duration === '1month') multiplier = 1;
    else if (duration === '2months') multiplier = 2;
    else if (duration === '3months') multiplier = 3;
  }

  const finalPrice = basePrice * multiplier;
  
  // You can add additional charges here
  // const serviceFee = finalPrice * 0.05; // 5% service fee
  // return finalPrice + serviceFee;

  return finalPrice;
}


router.post('/bookings/create', async (req, res) => {
  try {
    const {
      tutorId,
      tutorName,
      studentId,
      studentName,
      studentEmail,
      sessionType,
      slotInfo,
      duration,
      estimatedPrice,
    } = req.body;


    // Fetch tutor details to calculate accurate price
    const tutor = await usersCollection.findOne({ 
      _id: new ObjectId(tutorId) 
    });

    if (!tutor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tutor not found' 
      });
    }

    // ✅ SERVER-SIDE PRICE CALCULATION (Security)
    const finalPrice = calculateBookingPrice(tutor, sessionType, duration);

    // Check slot availability for batch sessions
    if (sessionType === 'batch') {
      const slot = tutor.sessions.batch.slots.find(s => s.id === slotInfo.id);
      const bookedCount = slot?.bookedCount || 0;
      const maxStudents = tutor.sessions.batch.maxStudents || 10;

      if (bookedCount >= maxStudents) {
        return res.status(400).json({
          success: false,
          message: 'This batch is full. Please select another slot.'
        });
      }
    }

    // Generate unique transaction ID
    const tran_id = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Create booking document
    const bookingData = {
      tutorId: new ObjectId(tutorId),
      tutorName,
      studentId,
      studentName,
      studentEmail,
      sessionType,
      slotInfo,
      duration,
      price: finalPrice,
      transactionId: tran_id,
      paymentStatus: 'pending',
      bookingStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await bookingsCollection.insertOne(bookingData);
    const bookingId = result.insertedId;

    // ✅ SSLCommerz Payment Data
    const paymentData = {
      total_amount: finalPrice,
      currency: 'BDT',
      tran_id: tran_id,
      success_url: `${process.env.BACKEND_URL}/api/payment/success`,
      fail_url: `${process.env.BACKEND_URL}/api/payment/fail`,
      cancel_url: `${process.env.BACKEND_URL}/api/payment/cancel`,
      ipn_url: `${process.env.BACKEND_URL}/api/payment/ipn`,
      shipping_method: 'NO',
      product_name: `${sessionType === 'personal' ? 'Personal' : 'Batch'} Coaching - ${slotInfo.name}`,
      product_category: 'Education',
      product_profile: 'non-physical-goods',
      cus_name: studentName,
      cus_email: studentEmail,
      cus_add1: 'N/A',
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: '01700000000', // Should get from user
      value_a: bookingId.toString(), // Store booking ID
      value_b: tutorId,
      value_c: sessionType,
    };

    // Initialize SSLCommerz
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const apiResponse = await sslcz.init(paymentData);

    if (apiResponse.status === 'SUCCESS') {
      return res.json({
        success: true,
        bookingId: bookingId.toString(),
        finalPrice,
        paymentUrl: apiResponse.GatewayPageURL,
        message: 'Booking created. Redirecting to payment...'
      });
    } else {
      // Delete booking if payment init failed
      await bookingsCollection.deleteOne({ _id: bookingId });
      return res.status(400).json({
        success: false,
        message: 'Payment initialization failed'
      });
    }

  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// payment success callback
router.post('/payment/success', async (req, res) => {
  try {
    const { tran_id, val_id, amount, card_type } = req.body;


    // Validate payment with SSLCommerz
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const validation = await sslcz.validate({ val_id });

    if (validation.status === 'VALID' || validation.status === 'VALIDATED') {
      // Find booking by transaction ID
      const booking = await bookingsCollection.findOne({ 
        transactionId: tran_id 
      });

      if (!booking) {
        return res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
      }

      // Update booking status
      await bookingsCollection.updateOne(
        { _id: booking._id },
        {
          $set: {
            paymentStatus: 'paid',
            bookingStatus: 'confirmed',
            paymentDetails: {
              validationId: val_id,
              cardType: card_type,
              paidAmount: parseFloat(amount),
              paidAt: new Date(),
            },
            updatedAt: new Date(),
          }
        }
      );

      // Update tutor's slot booking count (for batch sessions)
      if (booking.sessionType === 'batch') {
        await usersCollection.updateOne(
          { 
            _id: booking.tutorId,
            'sessions.batch.slots.id': booking.slotInfo.id
          },
          {
            $inc: { 'sessions.batch.slots.$.bookedCount': 1 }
          }
        );
      }

      // Send confirmation email/SMS to student and tutor

      // Redirect to success page
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/success?bookingId=${booking._id}`
      );
    } else {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
    }

  } catch (error) {
    console.error('Payment success error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
  }
});

// 3. PAYMENT FAIL CALLBACK
router.post('/payment/fail', async (req, res) => {
  try {
    const { tran_id } = req.body;

    // Update booking status
    await bookingsCollection.updateOne(
      { transactionId: tran_id },
      {
        $set: {
          paymentStatus: 'failed',
          bookingStatus: 'cancelled',
          updatedAt: new Date(),
        }
      }
    );

    res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
  } catch (error) {
    console.error('Payment fail error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
  }
});

// 4. PAYMENT CANCEL CALLBACK
router.post('/payment/cancel', async (req, res) => {
  try {
    const { tran_id } = req.body;

    await bookingsCollection.updateOne(
      { transactionId: tran_id },
      {
        $set: {
          paymentStatus: 'cancelled',
          bookingStatus: 'cancelled',
          updatedAt: new Date(),
        }
      }
    );

    res.redirect(`${process.env.FRONTEND_URL}/payment/cancelled`);
  } catch (error) {
    console.error('Payment cancel error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
  }
});

// 5. GET BOOKING DETAILS
router.get('/bookings/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await bookingsCollection.findOne({
      _id: new ObjectId(bookingId)
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});








module.exports = router;