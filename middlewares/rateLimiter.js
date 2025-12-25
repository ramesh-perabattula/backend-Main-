const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 failed requests per `window` (here, per 15 minutes)
    skipSuccessfulRequests: true, // Only count failed requests (status >= 400)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        status: 429,
        success: false,
        message: 'Too many failed attempts from this IP, please try again after 15 minutes'
    }
});

module.exports = limiter;
