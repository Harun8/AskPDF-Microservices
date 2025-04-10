// import { rateLimit } from 'express-rate-limit'

// export const limiter = rateLimit({
// 	windowMs: 15 * 60 * 1000, // 15 minutes
// 	limit: 15, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
// 	standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
// 	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
//     message: 'Too many requests from this IP, please try again after 15 minutes.',
// 	// store: ... , // Redis, Memcached, etc. See below.
// })