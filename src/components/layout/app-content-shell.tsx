"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export function AppContentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className="min-w-0">{children}</div>;
  }

  return (
    <motion.div
      key={pathname}
      className="min-w-0"
      initial={{ opacity: 0.88, y: 7, filter: "blur(2px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
