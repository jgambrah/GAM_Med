
'use client';

import { toast as sonnerToast } from "sonner"

const toast = sonnerToast;

function useToast() {
  return {
    toast,
    dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
  }
}

export { useToast, toast }
