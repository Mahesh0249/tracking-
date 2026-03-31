export function showToast(message) {
  window.dispatchEvent(new CustomEvent("study-toast", { detail: { message } }));
}
