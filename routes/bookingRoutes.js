const express = require('express');
const router = express.Router();
const SSLCommerzPayment = require('sslcommerz-lts');
const { ObjectId } = require('mongodb');

// SSLCommerz Configuration
const store_id = process.env.SSLCOMMERZ_STORE_ID;
const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD;
const is_live = false; // true for production, false for sandbox

const { client } = require("../db/dbConnect");
const { calculateBookingPrice } = require('../helpers/calculatePrice');
const db = client.db("StudyMate");
const usersCollection = db.collection("users");
const bookingsCollection = db.collection("bookings");


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
    const tutor = usersCollection.findOne({ 
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