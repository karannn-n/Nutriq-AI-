import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

/* react-router Link with Framer Motion gestures (hover lift, tap). */
const MotionLink = motion.create(Link);

export default MotionLink;
