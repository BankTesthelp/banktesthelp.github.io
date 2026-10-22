/* ============================================================
   BankTest.pk — site configuration
   ============================================================ */

/* ------------------------------------------------------------
   GOOGLE ADSENSE SETUP — follow these steps once approved:

   STEP 1: Paste your AdSense publisher ID below, e.g.
           "ca-pub-1234567890123456"

   STEP 2: Paste the AdSense <script> tag into the <head> of
           every page (right after the AdSense comment that is
           already there). It looks like this:

           <script async
             src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456"
             crossorigin="anonymous"></script>

           Replace ca-pub-1234567890123456 with your own ID.

   STEP 3: Replace each ad placeholder on the site with a real
           ad unit. Placeholders look like this in the HTML:

           <!-- AD PLACEHOLDER: paste your AdSense ad unit ... -->
           <div class="ad-slot"><span class="ad-label">Advertisement</span></div>

           Swap each one for your ad unit code, for example:

           <ins class="adsbygoogle"
                style="display:block"
                data-ad-client="ca-pub-1234567890123456"
                data-ad-slot="1234567890"
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>
           <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>

           Placeholder locations:
           - index.html ............ after the hero, after the bank grid
           - nbp.html / sbp.html .... after intro, mid-content
           - hbl/mcb/ubl/meezan/allied/bop.html ... one per page
           - topics.html ........... after the topic list
           - quiz.html / mock.html . on the results screen
   ------------------------------------------------------------ */

var ADSENSE_CLIENT_ID = "";   // <-- paste your "ca-pub-..." ID here

var AD_SLOTS = {
  header_banner: "",   // ad unit ID for top banner slots
  in_content:   "",   // ad unit ID for in-content slots
  results:      ""    // ad unit ID for quiz/mock result screens
};

var SITE_CONFIG = {
  siteName: "BankTest.pk",
  quizPassPercent: 60,   // pass/fail threshold for quizzes and mock tests
  mockMinutes: 60,       // mock test time limit
  mockQuestions: 50      // mock test question count
};
