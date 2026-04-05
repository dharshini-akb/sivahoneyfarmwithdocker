const express = require('express');
const DataSync = require('../models/DataSync');
const router = express.Router();

/**
 * @route   POST /api/sync/data
 * @desc    Insert data from a source system to target database
 * @access  Public (Can be protected with auth if needed)
 */
router.post('/data', async (req, res) => {
  // 1. Define Timeout (5 minutes / 300 seconds)
  const timeoutMs = 300 * 1000;
  
  // Create a timeout promise that rejects after 300 seconds
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('TIMEOUT_EXCEEDED'));
    }, timeoutMs);
  });

  try {
    const { sourceId, payload } = req.body;

    if (!sourceId || !payload) {
      return res.status(400).json({ 
        message: 'Missing required fields: sourceId and payload',
        receivedData: req.body 
      });
    }

    // Wrap database operation with the timeout promise using Promise.race
    const result = await Promise.race([
      (async () => {
        // Create new DataSync entry
        const newData = new DataSync({
          sourceId,
          payload
        });

        // Save to database
        await newData.save();
        return newData;
      })(),
      timeoutPromise
    ]);

    // Outcome: Data is loaded into the table successfully - HTTP response code=200
    return res.status(200).json({
      message: 'Data loaded into the table successfully',
      data: result
    });

  } catch (error) {
    // 2. Data is not loaded due to functional error (Duplicate entry) - HTTP response code=400/404
    if (error.code === 11000) {
      // MongoDB duplicate key error code is 11000
      return res.status(400).json({
        message: 'Data is not loaded due to functional error (Duplicate entry)',
        failedData: req.body, // Contains the actual data which has failed instead of generic error message
        errorCode: 'DUPLICATE_ENTRY'
      });
    }

    // 3. Connectivity or timeout error - HTTP response code=500
    if (error.message === 'TIMEOUT_EXCEEDED') {
      return res.status(500).json({
        message: 'Data is not loaded due to connectivity error (Process exceeded 5 minutes)',
        failedData: req.body,
        errorCode: 'CONNECTION_TIMEOUT'
      });
    }

    // General connectivity/server errors - HTTP response code=500
    console.error('Sync Error:', error);
    return res.status(500).json({
      message: 'Data is not loaded due to connectivity error',
      failedData: req.body,
      error: error.message,
      errorCode: 'INTERNAL_SERVER_ERROR'
    });
  }
});

module.exports = router;
