"use client";

import { authClient } from "~/lib/auth-client";
import { Button } from "../ui/button";
import { Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Upgrade() {
//   const upgrade = async () => {
//   try {
//     await authClient.checkout({
//       products: [
//         "c0590765-eac4-4c9d-2fc8-9f98920eba",
//         "7827650-ddd4-37b8-bfe8-671d1b1b6b",
//         "081eeea-c80a-4907-9592-073b0b606a f4",
//       ],
//     });
//   } catch (error) {
//     console.error("Checkout failed:", error);
//     toast.error("Upgrade failed – please try again");
//   }
// };

const upgrade = async () => {
  // await authClient.checkout({ products: [...] });  // ← comment out kar de abhi ke liye
  toast.info("Upgrade feature coming soon! (Checkout disabled for testing)");
  console.log("Upgrade clicked – products would be: ", [
    "616457b0-8ead-470f-b118-6e4e7a79e814",
    "061cc880-cff6-48d6-9b29-73882753fcb1",
    "298b6db2-d8ce-489a-af7e-b1927b1ce7e8",
  ]);
};
  return (
    <Button
      variant="outline"
      size="sm"
      className="group relative ml-2 overflow-hidden border-orange-400/50 bg-gradient-to-r from-orange-400/10 to-pink-500/10 text-orange-400 transition-all duration-300 hover:border-orange-500/70 hover:bg-gradient-to-r hover:from-orange-500 hover:to-pink-600 hover:text-white hover:shadow-lg hover:shadow-orange-500/25"
      onClick={upgrade}
    >
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
        <span className="font-medium">Upgrade</span>
        <Sparkles className="h-3 w-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      {/* Subtle glow effect */}
      <div className="absolute inset-0 rounded-md bg-gradient-to-r from-orange-400/20 to-pink-500/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </Button>
  );
}