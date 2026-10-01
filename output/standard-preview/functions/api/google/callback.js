import { finishGoogle } from '../../_shared/google-auth.js';

export const onRequestGet = (context) => finishGoogle(context);
