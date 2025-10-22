export function calculateBookingPrice(tutor, sessionType, duration) {
  const sessionConfig = tutor.sessions[sessionType];
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