/* =============================================================================
   Site data — edit here to add new videos and journal entries.
   Everything renders into the placeholders in index.html:
     [data-videos]  -> video gallery
     [data-posts]   -> journal / blog cards
   ========================================================================== */

/* ---------------------------------------------------------------- videos --- */
/* Links are taken from the official Facebook page (facebook.com/dino2022).      */
/*                                                                             */
/* `thumb`  optional. Path to a local image in assets/img/thumbs/.             */
/* `still`  set true if the image is a photo rather than a real video frame —   */
/*          Facebook's auto-thumbnail for that clip is a solid black frame.     */
/* Omit both to fall back to the branded gradient tile.                         */
window.SITE_DATA = {
  videos: [
    {
      id: "1392222609198399",
      title: "58th Regular Session of the 10th Sangguniang Panlungsod",
      caption: "The council floor in regular session — the chamber where the Grow-a-Forest ordinance and the city's other legislation are debated and passed.",
      category: "council",
      duration: "0:40",
      views: "453",
      when: "Most recent",
      thumb: "assets/img/thumbs/still-council-office.jpg",
      still: true,
      url: "https://www.facebook.com/dino2022/videos/58th-regular-session-of-the-10th-sangguniang-panlungsod-of-victorias-city/1392222609198399/"
    },
    {
      id: "1818005389619685",
      title: "66th Botika Sang Masa — Purok 8, Barrio Daan Banwa",
      caption: "The city government's health programme brought down to the purok, in Brgy. 9, Victorias City.",
      category: "program",
      duration: "1:54",
      views: "2.3K",
      when: "3 days ago",
      thumb: "assets/img/thumbs/1818005389619685.jpg",
      url: "https://www.facebook.com/dino2022/videos/66th-botika-sang-masa-sa-purok-8-barrio-daan-banwa-brgy-9-victorias-city/1818005389619685/"
    },
    {
      id: "1379216911050937",
      title: "Salamat sa mga naka agum sang mga bulong, vitamins, bugas",
      caption: "Medicines, vitamins, laundry soap and rubbing alcohol distributed at Purok 8, Brgy. 9 — with a compliance statement on the Anti-Epal Policy.",
      category: "program",
      duration: "3:35",
      views: "1.5K",
      when: "3 days ago",
      thumb: "assets/img/thumbs/1379216911050937.jpg",
      url: "https://www.facebook.com/dino2022/videos/66th-botika-sang-masa-sa-purok-8-barrio-daan-banuasalamat-sa-mga-naka-agum-sang-/1379216911050937/"
    },
    {
      id: "1823982645281686",
      title: "Five years of sharing, caring and giving back",
      caption: "The fifth consecutive year of the Adopt a Victoriasanon Family Program with the CSWD — this time for a hardworking fishing family.",
      category: "program",
      duration: "1:14",
      views: "1.5K",
      when: "6 days ago",
      thumb: "assets/img/thumbs/1823982645281686.jpg",
      url: "https://www.facebook.com/dino2022/videos/five-years-of-sharing-caring-and-giving-back-%EF%B8%8Ffor-the-5th-consecutive-year-since/1823982645281686/"
    },
    {
      id: "2124817634786544",
      title: "Botika Sang Masa for the city's employees",
      caption: "Serving the city workforce during the 126th Civil Service Month celebration.",
      category: "program",
      duration: "1:15",
      views: "515",
      when: "6 days ago",
      thumb: "assets/img/thumbs/2124817634786544.jpg",
      url: "https://www.facebook.com/dino2022/videos/thank-you-for-the-chance-to-serve-our-dearest-city-employees-thru-the-botika-san/2124817634786544/"
    },
    {
      id: "1776255363423731",
      title: "Negros Trade Fair 2026 — Butlak Negros",
      caption: "Representing the City of Victorias at the 2026 Negros Trade Fair. #parientesangmasa",
      category: "field",
      duration: "7:11",
      views: "806",
      when: "A week ago",
      thumb: "assets/img/thumbs/1776255363423731.jpg",
      url: "https://www.facebook.com/dino2022/videos/negros-trade-fair-2026-butlak-negros-aton-kilalahonparientesangmasa-dinoacuna/1776255363423731/"
    },
    {
      id: "4042188909417828",
      title: "Clark Freeport Zone, Pampanga",
      caption: "An official engagement in Pampanga. #parientesangmasa",
      category: "field",
      duration: "5:17",
      views: "1.7K",
      when: "A week ago",
      thumb: "assets/img/thumbs/4042188909417828.jpg",
      url: "https://www.facebook.com/dino2022/videos/clark-freeport-zone-sa-pampanga-aton-kilalahonparientesangmasa-dinoacuna/4042188909417828/"
    },
    {
      id: "2871241719914319",
      title: "Mactan Shrine",
      caption: "A marker of the first stand of Filipino people against occupation. #parientesangmasa",
      category: "field",
      duration: "5:56",
      views: "1K",
      when: "A week ago",
      thumb: "assets/img/thumbs/2871241719914319.jpg",
      url: "https://www.facebook.com/dino2022/videos/mactan-shrine-isa-ka-duog-nga-tanda-sang-una-nga-pakig-bato-sang-mga-pilipino-ko/2871241719914319/"
    },
    {
      id: "1651321780032246",
      title: "57th Regular Session, presided by Vice Mayor Derek Palanca",
      caption: "A productive session on responsive legislation and good governance for all Victoriasanons.",
      category: "council",
      duration: "0:40",
      views: "481",
      when: "2 weeks ago",
      url: "https://www.facebook.com/dino2022/videos/%EF%B8%8F-57th-regular-session-presided-by-vice-mayor-derek-palanca-productive-session-u/1651321780032246/"
    },
    {
      id: "1365551411801507",
      title: "On the ground since 2022 — visiting small business owners",
      caption: "“When I ran for City Council in 2022, and throughout my Council service, I visited with many small business owners in town.”",
      category: "field",
      duration: "—",
      views: "5.3K",
      when: "On the road",
      url: "https://www.facebook.com/61590790902444/videos/when-i-ran-for-city-council-in-2022-and-throughout-my-council-service-i-visited-/1365551411801507/"
    }
  ],

  /* ---------------------------------------------------------------- posts --- */
  /* 40 posts, generated by tools/sync-static-blog.mjs */
  posts: [
    {
      sortKey: "783",
      title: "SUPPORTING OUR WOMEN SECTOR",
      excerpt: "A heartfelt thank you to our dedicated women leaders for the opportunity to be part of today’s Educational, Entrepreneurial, and Environmental Benchmarking in Kabankalan City. Alongside Kons. Nity Sta Ana Bartolome, Kons.",
      tag: "Environment",
      date: "27 Mar 2025",
      url: "https://dinoacuna.wordpress.com/2025/03/27/supporting-our-women-sector/",
      slug: "supporting-our-women-sector",
      featuredImage: "assets/img/posts/20250326_115349.jpg"
    },
    {
      sortKey: "748",
      title: "Victorias City Strengthens Environmental Commitment Through Adopt-a-Forest Program",
      excerpt: "Victorias City is taking a bold step toward environmental sustainability with the implementation of City Ordinance No.",
      tag: "Environment",
      date: "26 Mar 2025",
      url: "https://dinoacuna.wordpress.com/2025/03/26/748/",
      slug: "748",
      featuredImage: "assets/img/posts/fb_img_1742964718304.jpg"
    },
    {
      sortKey: "670",
      title: "VICTORIAS CITY’S SIDLAK SANG KADALAG-AN DANCERS WIN GRAND SLAM CHAMPION IN THE BEST FESTIVAL OF DANCES COMPETION AT THE 2025 PANAAD SA NEGROS FESTIVAL",
      excerpt: "Congratulations to our very own Kadalag-an Festival Dancers for bagging the grand slam champion, winning in the best of Festival Dances at the Panaad sa Negros Festival held on March 24, 2025.",
      tag: "Heritage",
      date: "25 Mar 2025",
      url: "https://dinoacuna.wordpress.com/2025/03/25/victorias-citys-sidlak-sang-kadalag-an-dancers-win-grandslam-champion-in-the-best-festival-of-dances-competion-of-the-2025-panaad-sa-negros/",
      slug: "victorias-citys-sidlak-sang-kadalag-an-dancers-win-grandslam-champion-in-the-best-festival-of-dances-competion-of-the-2025-panaad-sa-negros",
      featuredImage: "assets/img/posts/fb_img_1742915516807-1.jpg"
    },
    {
      sortKey: "645",
      title: "Honoring Mayor SEVERO A. PALANCA: The Visionary Behind Victorias’ Cityhood & Mayor JAVIER MIGUEL L. BENITEZ: Continuing the Legacy of Service and Leading Victorias to the Pinnacle of Success",
      excerpt: "As we celebrate the 27th Kadalag-an Festival, we take a moment to honor and remember the man whose leadership and determination transformed Victorias from a small, quiet town into the thriving, progressive city it is today, Mayor Severo Acuña Palanca.",
      tag: "Heritage",
      date: "22 Mar 2025",
      url: "https://dinoacuna.wordpress.com/2025/03/22/honoring-mayor-severo-a-palanca-the-visionary-behind-victorias-cityhood-mayor-javier-miguel-l-benitez-continuing-the-legacy-of-service-and-leading-victorias-to-the-pinnacle-of-succe/",
      slug: "honoring-mayor-severo-a-palanca-the-visionary-behind-victorias-cityhood-mayor-javier-miguel-l-benitez-continuing-the-legacy-of-service-and-leading-victorias-to-the-pinnacle-of-succe",
      featuredImage: "assets/img/posts/screenshot_20250321_060000_chrome-1.jpg"
    },
    {
      sortKey: "619",
      title: "I Love My Generation",
      excerpt: "Traditional Baby Crib made of hardwood To Pinoys and Pinays born in the 40&#8217;s, 50&#8217;s, 60&#8217;s & 70&#8217;s!",
      tag: "Economy",
      date: "29 Oct 2011",
      url: "https://dinoacuna.wordpress.com/2011/10/29/i-love-my-generation/",
      slug: "i-love-my-generation",
      featuredImage: "assets/img/posts/2.png"
    },
    {
      sortKey: "612",
      title: "In Gratitude to: Mrs. Remedios P. Bantug",
      excerpt: "Mrs. Remedios P. Bantug Idiong Bantug in the town of Victorias is a symbol of generosity and great love. A matriarch in the truest sense of the word. She is loved by all. Every head bows to her in respect. An image of great power yet humble in heart.",
      tag: "Tribute",
      date: "28 Oct 2011",
      url: "https://dinoacuna.wordpress.com/2011/10/28/in-gratitude-to-mrs-remedios-p-bantug/",
      slug: "in-gratitude-to-mrs-remedios-p-bantug",
      featuredImage: "assets/img/posts/37302_1345123783788_1102069184_30816569_6632685_n-copy.jpg"
    },
    {
      sortKey: "599",
      title: "The Armed Conflict In Mindanao & PNoy",
      excerpt: "What has happened to our country these days? Filipinos killing Filipinos! The recent killings of 19 soldiers in the southern part of the Philippines in the province of Basilan proved that the long war between the state and the rebels are still unresolved.",
      tag: "Society",
      date: "28 Oct 2011",
      url: "https://dinoacuna.wordpress.com/2011/10/28/armed-conflict-in-mindanao-pnoy/",
      slug: "armed-conflict-in-mindanao-pnoy",
      featuredImage: "assets/img/posts/imagesca4xdkiq.jpg"
    },
    {
      sortKey: "592",
      title: "Albee’s Sugar Act Bill on the Rise",
      excerpt: "Cong. Albee Benitez Finally, our country’s sugar producing provinces including our very own Negros Occidental is poised to enjoy the most awaited sugar act bill.",
      tag: "Heritage",
      date: "24 Oct 2011",
      url: "https://dinoacuna.wordpress.com/2011/10/24/albees-sugar-act-bill-on-the-rise/",
      slug: "albees-sugar-act-bill-on-the-rise",
      featuredImage: "assets/img/posts/3020albee20benitez_1.jpg"
    },
    {
      sortKey: "568",
      title: "MISS ROSALINA J. HAUTEA",
      excerpt: "MISS ROSALINA J. HAUTEA Miss Rosalina Jaranilla Hautea, commonly known to close friends and relatives as “Lola Aling” or “Tya Saling” or simply “Aling” or “Saling”, passed away peacefully in the grace of our Lord on September 2, 2011 at the age of 84.",
      tag: "Tribute",
      date: "02 Oct 2011",
      url: "https://dinoacuna.wordpress.com/2011/10/02/miss-rosalina-j-hautea/",
      slug: "miss-rosalina-j-hautea",
      featuredImage: "assets/img/posts/30849_1454725777571_1516120012_1150429_7319635_n1.jpg"
    },
    {
      sortKey: "558",
      title: "Thank You For Your Sympathies",
      excerpt: "Perhaps you sent a lovely card Or sat quietly in a chair. Perhaps you sent a funeral spray If so we saw it there. Perhaps you spoke the kindest words As any friends could say. Perhaps you left a facebook message to convey your sympathies.",
      tag: "Tribute",
      date: "30 Sep 2011",
      url: "https://dinoacuna.wordpress.com/2011/09/30/thank-you-for-your-sympathies-2/",
      slug: "thank-you-for-your-sympathies-2",
      featuredImage: "assets/img/posts/131020107993.jpg"
    },
    {
      sortKey: "496",
      title: "Sleep Well Lola Aling, Good night . . . .",
      excerpt: "FAREWELL LOLA ALING MISS ROSALINA J. HAUTEA February 11, 1927-September 2, 2011 84 years, 6 months and 22 days I will miss you my love./Writing a farewell message to you is the hardest thing I could do./ I just can’t say Good bye./ I wish I could change the wh…",
      tag: "Tribute",
      date: "28 Sep 2011",
      url: "https://dinoacuna.wordpress.com/2011/09/28/sleep-well-lola-aling-good-night/",
      slug: "sleep-well-lola-aling-good-night",
      featuredImage: "assets/img/posts/13102010799.jpg"
    },
    {
      sortKey: "482",
      title: "AFP Anomalies Revealed",
      excerpt: "Former COA Auditor Heidi Mendoza Today, the names of AFP Generals like that of Angelo Reyes, Diomedio Villanueva, Roy Cimatu and their Comptrollers Carlos Garcia and Jacinto Ligot frequent the news, not mainly because of their services to the nation, but for p…",
      tag: "Society",
      date: "08 Feb 2011",
      url: "https://dinoacuna.wordpress.com/2011/02/08/afp-anomalies-revealed/",
      slug: "afp-anomalies-revealed",
      featuredImage: "assets/img/posts/senate-plea-bargain061.jpg"
    },
    {
      sortKey: "447",
      title: "Crimes and Criminalities in the Philippine Present Times",
      excerpt: "The Philippines today is bombarded with a soaring number of heinous and unimaginable crimes. Perpetrators are almost everywhere and fearless. Day by day, the news is filled with police matters and reports of lawlessness.",
      tag: "Society",
      date: "22 Jan 2011",
      url: "https://dinoacuna.wordpress.com/2011/01/22/crimes-and-criminalities-in-the-philippine-present-times/",
      slug: "crimes-and-criminalities-in-the-philippine-present-times",
      featuredImage: "assets/img/posts/thumbnailca0br7ru.jpg"
    },
    {
      sortKey: "437",
      title: "OFW Remittances:4th largest in the World",
      excerpt: "Filipino migrant workers remained one of the world&#8217;s biggest money senders to the home country. Being the 4th in the world makes a lot of difference to the economy of the Philippines.",
      tag: "Economy",
      date: "11 Dec 2010",
      url: "https://dinoacuna.wordpress.com/2010/12/11/filipino-remittances-is-4th-largest-in-the-world/",
      slug: "filipino-remittances-is-4th-largest-in-the-world",
      featuredImage: "assets/img/posts/philippine-flag.jpg"
    },
    {
      sortKey: "424",
      title: "A victory in Chile",
      excerpt: "After 69 days underneath the earth, entombed and trapped, 33 miners surfaced the earth in Chile, 2,040 feet above. It ended the longest underground nightmare in the history of mankind.",
      tag: "World",
      date: "14 Oct 2010",
      url: "https://dinoacuna.wordpress.com/2010/10/14/a-victory-in-chile/",
      slug: "a-victory-in-chile",
      featuredImage: "assets/img/posts/r2788983007.jpg"
    },
    {
      sortKey: "408",
      title: "The luring temptation of Jueteng Payola",
      excerpt: "Jueteng in the Philippines dates back to as far as the Spanish era. Originated from China, it means Jue (flower) and teng (bet), is a very popular and widely played numbers game among Filipinos.",
      tag: "Politics",
      date: "22 Sep 2010",
      url: "https://dinoacuna.wordpress.com/2010/09/22/the-luring-temptation-of-jueteng-payola/",
      slug: "the-luring-temptation-of-jueteng-payola",
      featuredImage: "assets/img/posts/lotto20220balls-277x300.jpg"
    },
    {
      sortKey: "394",
      title: "Hail to Executive Order Number 7",
      excerpt: "Finally, on September 8, P-Noy put a temporary halt to what have been the simplest form of social injustice and typical display of the absence of integrity on the part of GOCC and GFI officials who have, for many years, enriched themselves with fat bonuses and…",
      tag: "Economy",
      date: "13 Sep 2010",
      url: "https://dinoacuna.wordpress.com/2010/09/13/hail-to-executive-order-number-7/",
      slug: "hail-to-executive-order-number-7",
      featuredImage: "assets/img/posts/philippinepresidentialseal.jpg"
    },
    {
      sortKey: "374",
      title: "One incident, many results",
      excerpt: "Police and SWAT members assault a tourist bus to rescue hostages at Manila's Rizal Park Monday Aug.23, 2010 in Manila The neverending debates go on and on over the tragic incident of the Manila Bus Hostage Crisis that happend last August 23.",
      tag: "World",
      date: "28 Aug 2010",
      url: "https://dinoacuna.wordpress.com/2010/08/28/one-incident-many-results/",
      slug: "one-incident-many-results",
      featuredImage: "assets/img/posts/capt_7e5403e8000949dd8a3f8d1b11af4177-7e5403e8000949dd8a3f8d1b11af4177-0.jpg"
    },
    {
      sortKey: "366",
      title: "Statement of the President on the hostage-taking incident at the Quirino Grandstand",
      excerpt: "President Benigno Simeon C. Aquino, III With the rest of the Filipino people, I wish to offer our deepest condolences to the families of the victims whose lives were lost in the hostage situation at the Quirino Grandstand.",
      tag: "World",
      date: "24 Aug 2010",
      url: "https://dinoacuna.wordpress.com/2010/08/24/statement-of-the-president-on-the-hostage-taking-incident-at-the-quirino-grandstand/",
      slug: "statement-of-the-president-on-the-hostage-taking-incident-at-the-quirino-grandstand",
      featuredImage: "assets/img/posts/39824_419164662273_132390222273_5308478_3485468_n.jpg"
    },
    {
      sortKey: "352",
      title: "Bus Hostage Crisis:Why Rolando Mendoza had to resort to this?",
      excerpt: "It is always easy to say that former Chief Inspector Mendoza had lost his sanity when he resorted into a Bus Hostage Saga yesterday. Losing his own life and 8 others in a bloody shootout is indeed horrible.",
      tag: "World",
      date: "23 Aug 2010",
      url: "https://dinoacuna.wordpress.com/2010/08/23/bus-hostage-crisiswhy-rolando-mendoza-had-to-resort-to-this/",
      slug: "bus-hostage-crisiswhy-rolando-mendoza-had-to-resort-to-this",
      featuredImage: "assets/img/posts/r3072668526.jpg"
    },
    {
      sortKey: "340",
      title: "Police Brutality:A Monster in Uniform",
      excerpt: "A naked man lying on the floor grimacing in pain each time his torturer pulls the string attached to his genitals. This was the scenery shown on TV last Tuesday.",
      tag: "Society",
      date: "19 Aug 2010",
      url: "https://dinoacuna.wordpress.com/2010/08/19/police-brutality-a-monster-in-uniform/",
      slug: "police-brutality-a-monster-in-uniform",
      featuredImage: "assets/img/posts/pic-08190353180842.jpg"
    },
    {
      sortKey: "326",
      title: "4 Reasons Why Merceditas Gutierrez Should depart as Ombudsman Head",
      excerpt: "Ombudsman Ma. Merciditas Navarro Gutierrez As head of the country&#8217;s powerful Ombudsman office, Merceditas Gutierrez has failed to perform her mandate.",
      tag: "Politics",
      date: "13 Aug 2010",
      url: "https://dinoacuna.wordpress.com/2010/08/13/4-reasons-why-merceditas-guttierez-should-depart-as-ombudsman-head/",
      slug: "4-reasons-why-merceditas-guttierez-should-depart-as-ombudsman-head",
      featuredImage: "assets/img/posts/ma_merceditas_navarro-gutierrez.jpg"
    },
    {
      sortKey: "315",
      title: "Hell No to Pagcor Privatization",
      excerpt: "Selling Pagcor is definitely the biggest mistake this Administration could possibly commit. Why sell the hen that lays the golden eggs? Pagcor, according to its website is the second biggest revenue contributor.",
      tag: "Economy",
      date: "09 Aug 2010",
      url: "https://dinoacuna.wordpress.com/2010/08/09/hell-no-to-pagcor-privatization/",
      slug: "hell-no-to-pagcor-privatization",
      featuredImage: "assets/img/posts/pagcor_logo.jpg"
    },
    {
      sortKey: "293",
      title: "Highest paid Actors and Actresses in Philippine Government for CY2009",
      excerpt: "Development Bank of the Philippines BSP Land Bank of the Philippines SSS MWSS PDIC Name of Officer -Mother Unit- Amount 1. Arreza, Armand D. (SBMA) &#8212; 26,865,923.20 2. Ricafort, Benigno (CDC) &#8212; 14,506,466.74 3. Garcia, Edgardo F.",
      tag: "Journal",
      date: "07 Aug 2010",
      url: "https://dinoacuna.wordpress.com/2010/08/07/highest-paid-actors-and-actresses-in-philippine-government-for-cy2009/",
      slug: "highest-paid-actors-and-actresses-in-philippine-government-for-cy2009",
      featuredImage: "assets/img/posts/1683607585_6b94d6d69f.jpg"
    },
    {
      sortKey: "279",
      title: "Ivan should have been given a chance:A grieving mother’s cry",
      excerpt: "Malou Padilla, the mother of the alleged leader of Ivan Padilla Robbery and Carjacking Group, was able to visit her dead son at the Heritage Park, shortly before son&#8217;s remains was cremated.",
      tag: "Journal",
      date: "05 Aug 2010",
      url: "https://dinoacuna.wordpress.com/2010/08/05/ivan-should-have-been-given-a-chancea-grieving-mothers-cry/",
      slug: "ivan-should-have-been-given-a-chancea-grieving-mothers-cry",
      featuredImage: "assets/img/posts/39619_143973285622677_143898882296784_338574_3502217_n.jpg"
    },
    {
      sortKey: "262",
      title: "Noy Gets First Paycheck as President",
      excerpt: "President Noynoy Aquino who was sworned into office as the country&#8217;s 15th President last June 30 has receieved his 1st paycheck, covering the month of July. A net total of Php 63,002.17 went straight to the bank.",
      tag: "Politics",
      date: "04 Aug 2010",
      url: "https://dinoacuna.wordpress.com/2010/08/04/noy-gets-1st-paycheck-as-president/",
      slug: "noy-gets-1st-paycheck-as-president",
      featuredImage: "assets/img/posts/philippinepresidentialseal.jpg"
    },
    {
      sortKey: "250",
      title: "PNP Seeks to remove LGU’s power to appoint chiefs",
      excerpt: "Section 51 of Republic Act 6975, otherwise known as the &#8220;PNP Law&#8221; among other things provide, that the Governor in the case of the Provincial Government, in his capacity as a deputized representative of the National Police Commission, shall have th…",
      tag: "Society",
      date: "02 Aug 2010",
      url: "https://dinoacuna.wordpress.com/2010/08/02/pnp-seeks-to-remove-lgus-authoriy-to-appoint-chiefs/",
      slug: "pnp-seeks-to-remove-lgus-authoriy-to-appoint-chiefs",
      featuredImage: "assets/img/posts/pnp_logo.png"
    },
    {
      sortKey: "245",
      title: "P-Noy’s Speech on Mom’s 1st. Anniversary of Death",
      excerpt: "P-Noy giving his message on the occassion of his Mom's 1st Death Anniversary August 1,2010 Sunday LSGH A year ago today many of you shared our grief when our mother passed away. The days we spent here in Lasalle were marked with sadness.",
      tag: "Heritage",
      date: "01 Aug 2010",
      url: "https://dinoacuna.wordpress.com/2010/08/01/p-noys-speech-on-moms-1st-anniversary-of-death/",
      slug: "p-noys-speech-on-moms-1st-anniversary-of-death",
      featuredImage: "assets/img/posts/39631_419174272273_132390222273_5308881_6154394_n.jpg"
    },
    {
      sortKey: "216",
      title: "Remembering Cory",
      excerpt: "President Corazon C. Aquino 18 years after stepping down as the 11th President of the Philippines, Cory Aquino is mostly remembered by the millions of first time voters as the President of the Philippines, Icon of Democracy and symbol of EDSA Revolution.",
      tag: "Tribute",
      date: "30 Jul 2010",
      url: "https://dinoacuna.wordpress.com/2010/07/30/remembering-cory/",
      slug: "remembering-cory",
      featuredImage: "assets/img/posts/r409785_19353391.jpg"
    },
    {
      sortKey: "199",
      title: "Oversupply of Rice vs food security",
      excerpt: "P-Noy delivering his 1st SONA After former Agriculture and now Bohol Congressman Arthur Yap refuted P-Noy&#8217;s statement regarding the country&#8217;s over importation of rice in the last three years, more and more evidence are coming out everyday, to prove…",
      tag: "Heritage",
      date: "29 Jul 2010",
      url: "https://dinoacuna.wordpress.com/2010/07/29/oversupply-of-rice-vs-food-security/",
      slug: "oversupply-of-rice-vs-food-security",
      featuredImage: "assets/img/posts/39491_417247712273_132390222273_5255635_1224479_n.jpg"
    },
    {
      sortKey: "179",
      title: "SONA: Shallow and Dry yet, Straight to the point like hitting Bullets",
      excerpt: "President Benigno S. C. Aquino Admittedly I say, my expectations were more than what I actually heard yesterday, when President Benigno S.C. Aquino, gave his 1st State of the Nation Address before the members of the 15th Congress of the Philippines.",
      tag: "Politics",
      date: "26 Jul 2010",
      url: "https://dinoacuna.wordpress.com/2010/07/26/sona-shallow-and-dry-yet-straight-to-the-point-like-hitting-bullets/",
      slug: "sona-shallow-and-dry-yet-straight-to-the-point-like-hitting-bullets",
      featuredImage: "assets/img/posts/noynoy-aquino.jpg"
    },
    {
      sortKey: "171",
      title: "Sona of President Noynoy Aquino",
      excerpt: "P-Noy on his State of the Nation Address before the 15th Congress The SONA crowd English Transcription of President Benigno Noynoy Aquino III SONA State of the Nation Address of His Excellency Benigno S.",
      tag: "Politics",
      date: "26 Jul 2010",
      url: "https://dinoacuna.wordpress.com/2010/07/26/p-noy-sona-2010/",
      slug: "p-noy-sona-2010",
      featuredImage: "assets/img/posts/noy.jpg"
    },
    {
      sortKey: "155",
      title: "Pangilinan backs out of senate presidency",
      excerpt: "The Philippine Senate Building Contrary to Senator Kiko Pangilinan&#8217;s previous statement, that he will fulfill what he promised the Filipino people, which is to run for the Senate Presidency, win or lost, he withdrew his bid, a day before the Senate elect…",
      tag: "Politics",
      date: "26 Jul 2010",
      url: "https://dinoacuna.wordpress.com/2010/07/26/pangilinan-backs-out-of-the-race-for-senate-presidency/",
      slug: "pangilinan-backs-out-of-the-race-for-senate-presidency",
      featuredImage: "assets/img/posts/243484226_a86ccefb04.jpg"
    },
    {
      sortKey: "127",
      title: "The kind of trouble, Merly Fortu got herself into",
      excerpt: "Vice Governor Genaro Alvarez and Governor Alfredo Maranon, during their Inaugaration.",
      tag: "Journal",
      date: "24 Jul 2010",
      url: "https://dinoacuna.wordpress.com/2010/07/24/the-kind-of-trouble-merly-fortu-got-herself-into/",
      slug: "the-kind-of-trouble-merly-fortu-got-herself-into",
      featuredImage: "assets/img/posts/34207_409058686589_826376589_4260603_42710_n.jpg"
    },
    {
      sortKey: "101",
      title: "The Battle for Senate Presidency: Is it going to be Pangilinan? Villar? . . . or Enrile?",
      excerpt: "As July 26 draws near, the country&#8217;s politicians in the Upper Chamber become more and more restless, on how they cradle their race towards the Senate Presidency. Sen.",
      tag: "Politics",
      date: "23 Jul 2010",
      url: "https://dinoacuna.wordpress.com/2010/07/23/the-battle-for-senate-presidencyis-it-going-to-be-pangilinan-villar-or-enrile/",
      slug: "the-battle-for-senate-presidencyis-it-going-to-be-pangilinan-villar-or-enrile",
      featuredImage: "assets/img/posts/senate_seal2.png"
    },
    {
      sortKey: "59",
      title: "Pagcor and the Yummy Burgers",
      excerpt: "Pagcor, despite former Chairman Efraim Genuino&#8217;s boastful remarks on ANC&#8217;s Karen Davila, about his achievements and clean leadership in the country&#8217;s second largest revenue contributor, has in a short span of time become the country&#8217;s m…",
      tag: "Heritage",
      date: "21 Jul 2010",
      url: "https://dinoacuna.wordpress.com/2010/07/21/pagcor-and-the-yummy-burger/",
      slug: "pagcor-and-the-yummy-burger",
      featuredImage: "assets/img/posts/pagcor_logo.jpg"
    },
    {
      sortKey: "40",
      title: "Why did COMELEC allow Mikey Arroyo to represent Security Guards and Cab Drivers?",
      excerpt: "It is almost uncomprehendable, to think that former Pampanga Congressman and Presidential son Mikey Arroyo, being the first nominee of the partylist &#8220;Ang Galing Pinoy&#8221;, will represent a sector, he himself have never been one.",
      tag: "Politics",
      date: "21 Jul 2010",
      url: "https://dinoacuna.wordpress.com/2010/07/21/why-did-comelec-allow-mikey-arroyo-to-represent-security-guards-and-cab-drivers/",
      slug: "why-did-comelec-allow-mikey-arroyo-to-represent-security-guards-and-cab-drivers",
      featuredImage: "assets/img/posts/comelec_seal.png"
    },
    {
      sortKey: "27",
      title: "Too much politics in the Senate",
      excerpt: "I can say majority, if not all of our duly elected members of the 14th Congress in the Upper House, are the best choices that we can have, for the Senate.",
      tag: "Politics",
      date: "20 Jul 2010",
      url: "https://dinoacuna.wordpress.com/2010/07/20/too-much-politics-in-the-senate/",
      slug: "too-much-politics-in-the-senate",
      featuredImage: "assets/img/posts/senate_seal.png"
    },
    {
      sortKey: "09",
      title: "Where is Lakas-Kampi-CMD now?",
      excerpt: "For many years in the past two decades, we have seen Lakas NUCD, along wth its alliances with other parties, ruled the Philippine politics, taking most of the major positions in the government.",
      tag: "Politics",
      date: "20 Jul 2010",
      url: "https://dinoacuna.wordpress.com/2010/07/20/where-is-lakas-kampi-cmd-now/",
      slug: "where-is-lakas-kampi-cmd-now",
      featuredImage: "assets/img/posts/150px-coat_of_arms_of_the_philippines_svg1.png"
    },
    {
      sortKey: "01",
      title: "Hello world!",
      excerpt: "First and foremost, thank you for dropping by. I appreciate you for your time and effort. I hope you have a good day and my best regards to you. As I start blogging, I belive it is important that my readers should have or atleast know a little bit about me.",
      tag: "Politics",
      date: "19 Jul 2010",
      url: "https://dinoacuna.wordpress.com/2010/07/19/hello-world/",
      slug: "hello-world",
      featuredImage: "assets/img/posts/imag0012.jpg"
    },
  ],
};
