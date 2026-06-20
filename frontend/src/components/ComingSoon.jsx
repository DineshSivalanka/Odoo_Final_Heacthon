import { motion } from 'framer-motion';
import { Construction } from 'lucide-react';

export default function ComingSoon({ name }) {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="empty-icon"><Construction size={48} strokeWidth={1} /></div>
      <h3>{name} — Coming Soon</h3>
      <p>This module is being built. Check back shortly!</p>
    </motion.div>
  );
}
