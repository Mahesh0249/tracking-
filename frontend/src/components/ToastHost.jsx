import { useEffect, useState } from "react";

export default function ToastHost() {
  const [toast, setToast] = useState("");

  useEffect(() => {
    let timer = null;

    function onToast(event) {
      const nextMessage = event?.detail?.message || "Saved";
      setToast(nextMessage);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setToast(""), 2000);
    }

    window.addEventListener("study-toast", onToast);
    return () => {
      window.removeEventListener("study-toast", onToast);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  return <div className="toast">{toast}</div>;
}
