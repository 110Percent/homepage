// @ts-check
import { defineConfig } from "astro/config";
import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
    integrations: [
        icon({
            include: {
                mdi: [
                    "map-marker",
                    "github",
                    "gitlab",
                    "web",
                    "email-outline",
                    "linkedin"
                ]
            }
        })
    ]
});
