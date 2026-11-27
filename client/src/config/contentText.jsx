import { fill, renderInline } from '../utils/inline';
import { CONTENT_VARS } from './contentVars';

export const contentText = (text) => renderInline(fill(text, CONTENT_VARS));
export const plainText = (text) => fill(text, CONTENT_VARS);
