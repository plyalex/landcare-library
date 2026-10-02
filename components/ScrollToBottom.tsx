"use client";

import { useEffect, useRef } from "react";

export default function ScrollToBottom() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  });
  return <div ref={ref} aria-hidden />;
}
