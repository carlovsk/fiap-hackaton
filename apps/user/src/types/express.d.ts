// src/types/express.d.ts
import { JwtPayload } from './jwt';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}
