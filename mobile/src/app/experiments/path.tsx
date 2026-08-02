/** Throwaway layout experiment — /experiments/path.
 *
 * Nothing in the production app links here; it's reachable only by typing the URL. The route
 * file is deliberately a one-liner so all the actual work sits outside src/app/ (every file
 * under src/app/ becomes a route, so the experiment's own components can't live there). */
export { default } from '@/experiments/path/PathScreen';
