# A little wish for Lea

A pink, mobile-friendly birthday website with 23 candles that light one by one, a countdown, microphone or tap candle blowing, a slow floral reveal with peonies, roses, hydrangeas and cosmos, a personal note, and a date invitation with a gently wandering No button.

The floral reveal restores individual peonies, roses, hydrangeas, and cosmos. Each bloom grows from the center in one continuous, gently eased drift, spreads across the viewport, and fades into a softly appearing bouquet. Phone and laptop layouts share the same public URL. Phone music controls, navigation, and secondary buttons have larger tap areas. The No button initially sits beside Yes; its first click makes it jump away, and later it moves away from nearby pointers with smooth acceleration rather than following a fixed path. The candle finale adds a small set of gentle twinkles.

## Personalize

Edit `config.js`. It contains the name, candle count, lighting speed, birthday paragraphs, signature, invitation text, and reply text.

## Preview

Serve the repository root with any static HTTP server. Microphone access requires HTTPS or localhost. The microphone is requested only after pressing the blow button, is analyzed locally, and is released after the candles go out or when leaving the page. A tap option always works without microphone access.

The opening page waits quietly with all 23 candles unlit. Tapping “Light my candles” starts both the candle-lighting countdown and the soft Happy Birthday piano in the same user interaction. The piano uses a native HTML audio player and a locally hosted arrangement made from Salamander samples. Restarting returns to this quiet, ready-to-begin state. This piano becomes quieter while listening for a blow. Entering the flower page immediately switches to the supplied MP3 of Hoàng Tôn’s Dành Cho Em; it then continues across the flower, letter, date, and Yes pages and repeats if it ends. The volume slider controls the active theme. Browser autoplay policies may require a visitor interaction; the song is served directly with the website. Explicit pause/mute choices are preserved.

## Share and deploy

Live website: https://cuongisme04.github.io/a-little-wish-for-lea/

Hosted with GitHub Pages from the `main` branch, `/` (root). Changes pushed to `main` publish automatically. All website files are at the repository root; no build command or dependency installation is needed. The `.nojekyll` file keeps the static files unchanged.

Anyone with the website URL can visit without signing in. A local preview link works only on the computer running the server.

The Yes button displays a celebration and offers the visitor a native share sheet or copies a reply to paste into a message. It does not automatically send you a notification or save a response on a server.

## Sources and credits

- Cake geometry adapted from https://github.com/sherryuser/cake-blow. Retain `LICENSE.cake-blow` when redistributing. That repository credits Fazlur Rahman’s original cake design.
- Candle interaction reference: https://www.tiktok.com/@ldrdate/video/7525713063635422469
- Floral flight reference: https://www.tiktok.com/@flowers_the_bloom/video/7672001255568330006
- Flower artwork generated with the built-in ImageGen tool; the original prompt is in `ASSET-PROMPT.md`. No video frames or artwork were copied from the TikTok references.
- Fonts: Google Fonts, with local system fallbacks.
- Piano samples: Salamander Grand Piano by Alexander Holm, CC BY 3.0, via https://github.com/Tonejs/audio/tree/master/salamander. Attribution and license are included in `assets/piano/CREDITS.txt`. A new soft arrangement uses selected pitch-shifted samples.
- Music: Dành Cho Em by Hoàng Tôn, from the MP3 supplied by the site owner (`assets/danh-cho-em.mp3`). The same native audio element switches tracks directly in the flower-page click handler, with no embedded player or separate play step.

## Verification

The browser flow should be checked at desktop and mobile widths: no lighting or audio before starting, start-button tap or keyboard activation starts piano and countdown 23 → 0, all 23 candles lit, tap extinguishing, envelope opening, flower replay, note, moving No, Yes celebration, restart. Microphone blow detection needs a real device and microphone to verify fully.
