import { describe, expect, it } from "vitest";

import { chromeIntentUrl, detectInAppBrowser } from "./in-app-browser";

const UA = {
  instagramIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 334.0.4.32.98 (iPhone15,2; iOS 17_5; fr_FR; fr; scale=3.00; 1179x2556; 609349960)",
  instagramAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.71 Mobile Safari/537.36 Instagram 337.0.0.35.102 Android (34/14; 480dpi; 1080x2340; samsung; SM-S918B; dm3q; qcom; fr_FR; 614278950)",
  facebookIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/462.0.0.48.106;FBBV/600000000;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.4;FBSS/3;FBID/phone;FBLC/fr_FR;FBOP/5]",
  messengerAndroid:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230805.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.6422.165 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/460.0.0.36.109;]",
  tiktokAndroid:
    "Mozilla/5.0 (Linux; Android 12; M2101K6G Build/SKQ1.210908.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.193 Mobile Safari/537.36 trill_340204 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/34.2.4 ByteLocale/fr ByteFullLocale/fr Region/MA BytedanceWebview/d8a21c6",
  snapchatIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/13.0.0.0 (like Safari/8618.2.12.10.3, panda)",
  linkedinIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.29.8963",
  safariIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  chromeDesktop:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  firefoxDesktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:128.0) Gecko/20100101 Firefox/128.0",
};

describe("in-app browsers", () => {
  it("recognises each app, and the phone's system", () => {
    expect(detectInAppBrowser(UA.instagramIos)).toEqual({ app: "instagram", os: "ios" });
    expect(detectInAppBrowser(UA.instagramAndroid)).toEqual({ app: "instagram", os: "android" });
    expect(detectInAppBrowser(UA.facebookIos)).toEqual({ app: "facebook", os: "ios" });
    expect(detectInAppBrowser(UA.messengerAndroid)).toEqual({ app: "messenger", os: "android" });
    expect(detectInAppBrowser(UA.tiktokAndroid)).toEqual({ app: "tiktok", os: "android" });
    expect(detectInAppBrowser(UA.snapchatIos)).toEqual({ app: "snapchat", os: "ios" });
    expect(detectInAppBrowser(UA.linkedinIos)).toEqual({ app: "linkedin", os: "ios" });
  });

  it("leaves real browsers alone", () => {
    for (const ua of [UA.safariIos, UA.chromeAndroid, UA.chromeDesktop, UA.firefoxDesktop]) {
      expect(detectInAppBrowser(ua)).toBeNull();
    }
    expect(detectInAppBrowser(null)).toBeNull();
    expect(detectInAppBrowser("")).toBeNull();
    // A word in passing is not an app's marker.
    expect(detectInAppBrowser(`${UA.chromeDesktop} (shared from Instagram)`)).toBeNull();
  });

  it("builds a Chrome intent for an http(s) page only", () => {
    expect(chromeIntentUrl("https://thesessionlink.com/login?intent=signup")).toBe(
      "intent://thesessionlink.com/login?intent=signup#Intent;scheme=https;package=com.android.chrome;" +
        "S.browser_fallback_url=https%3A%2F%2Fthesessionlink.com%2Flogin%3Fintent%3Dsignup;end",
    );
    expect(chromeIntentUrl("javascript:alert(1)")).toBeNull();
    expect(chromeIntentUrl("not a url")).toBeNull();
  });
});
