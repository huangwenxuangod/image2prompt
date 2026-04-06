import { setAuthState } from "../../lib/web-api";

export default defineContentScript({
  matches: ["http://localhost:3000/*", "https://*/connect"],
  runAt: "document_end",
  main() {
    window.addEventListener("message", async (event) => {
      if (event.data?.type === "image2prompt:auth") {
        const { token, userId } = event.data;
        await setAuthState(token, userId);

        if (window.opener) {
          window.opener.postMessage(
            { type: "image2prompt:auth:success" },
            "*"
          );
        }
      }
    });
  },
});
