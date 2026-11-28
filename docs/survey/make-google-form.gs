/**
 * Makes Deepika's survey as a Google Form, with a spreadsheet for the answers.
 *
 * How to use it
 *   1. Sign in to the Google account that should own the answers: the
 *      practice's own, not a personal one. Whoever owns the form can read every
 *      name and phone number left on it. With more than one Google account
 *      signed in, use a private window signed in to that one alone.
 *   2. Open https://script.new, delete what is there, paste this whole file.
 *   3. Press Run. Google asks for permission the first time, because the script
 *      makes a form and a spreadsheet in your Drive. It is your own script, so
 *      the "Google hasn't verified this app" screen is expected: Advanced, then
 *      "Go to Untitled project".
 *   4. The link to send, the link to edit and the link to the answers are in
 *      the Execution log at the bottom.
 *
 * The questions live in SURVEY below and nowhere else. docs/SURVEY.md says why
 * each one is worded the way it is. Running this again makes a second form; it
 * never changes one that already exists.
 *
 * Not run against Google from this repository: there is no Google account in
 * the build. `node docs/survey/check.mjs` runs it against a stand-in that knows
 * the method names used here, which catches a typo and nothing more.
 */

var SURVEY = {
  "title": "Your health, and what gets in the way",
  "intro": "Hi, I'm Deepika. I'm designing a health programme for busy women juggling work, home and family, and I'd love your input on your health goals, struggles and what gets in the way. It takes about 3 minutes and is mostly taps. No name needed: your answers are anonymous unless you choose to leave your number at the end. Thank you!",
  "thanks": "Thank you. This really helps. Deepika",
  "questions": [
    {
      "id": "age",
      "kind": "one",
      "title": "What is your age? (pick one)",
      "options": ["Under 30", "30-34", "35-39", "40-44", "45-49", "50 or above"],
      "required": true
    },
    {
      "id": "work",
      "kind": "one",
      "title": "What does your work look like right now? (pick one)",
      "options": [
        "Working full-time",
        "Working part-time or freelance",
        "Running my own business",
        "Homemaker",
        "On a career break"
      ],
      "other": true,
      "required": true
    },
    {
      "id": "youngest",
      "kind": "one",
      "title": "How old is your youngest child? (pick one)",
      "options": [
        "Under 1 year",
        "1 to 5 years",
        "6 to 12 years",
        "13 to 18 years",
        "Over 18",
        "I don't have children"
      ],
      "required": true
    },
    {
      "id": "struggle",
      "kind": "one",
      "title": "What is your biggest health struggle right now? (pick one)",
      "options": [
        "Losing weight",
        "Gaining weight",
        "Low energy - tired most of the day",
        "Poor sleep",
        "Poor overall fitness impacting daily activities",
        "Building strength",
        "Eating well",
        "Hormonal changes (periods / PCOS / thyroid / perimenopause)",
        "Aches and pains",
        "Stress"
      ],
      "other": true,
      "required": true
    },
    {
      "id": "barriers",
      "kind": "many",
      "max": 3,
      "title": "What gets in the way of working on your health? (pick up to 3)",
      "options": [
        "No time",
        "Too much conflicting advice adding to confusion",
        "Don't have anyone to guide me",
        "Hard to stay consistent",
        "Family or work comes first",
        "Too tired by the end of the day",
        "A health issue or pain holds me back",
        "It costs too much"
      ],
      "other": true,
      "required": true
    },
    {
      "id": "worked",
      "kind": "one",
      "title": "What has worked best for you in the past? (pick one)",
      "options": [
        "Gym",
        "Personal trainer",
        "Yoga or group classes",
        "Dietitian or nutritionist",
        "App or online programme",
        "Self-guided (YouTube / Instagram / walking)",
        "Nothing has worked for long",
        "I haven't tried anything yet"
      ],
      "other": true,
      "required": true
    },
    {
      "id": "why",
      "kind": "line",
      "title": "Why did it work - or why not? (optional)",
      "help": "One line is enough.",
      "required": false
    },
    {
      "id": "missing",
      "kind": "many",
      "max": 3,
      "title": "Looking back, what was missing from the help you've had so far? (pick up to 3)",
      "options": [
        "It wasn't personalised to me",
        "No one followed up to keep me on track",
        "Food, exercise and sleep were handled separately",
        "It was too strict to keep up",
        "It didn't fit into my day",
        "The results didn't last once I stopped",
        "It cost too much",
        "I haven't had any help so far"
      ],
      "other": true,
      "required": true
    },
    {
      "id": "coach",
      "kind": "many",
      "max": 3,
      "title": "Top 3 things a health coach must give you for you to succeed (pick up to 3)",
      "options": [
        "Regular check-ins and accountability",
        "Seeing results I can measure",
        "A plan built around my schedule",
        "One person looking at food, exercise and sleep together",
        "Someone who understands women's health at my stage",
        "No judgement when I slip",
        "Small changes I can keep up",
        "Knowing why - not just being told what to do",
        "Being told exactly what to eat"
      ],
      "other": true,
      "required": true
    },
    {
      "id": "worth",
      "kind": "many",
      "max": 3,
      "title": "Six months from now, what would make you say \"this was worth it\"? (pick up to 3)",
      "options": [
        "Weight or inches down",
        "Clothes fitting better",
        "Feeling stronger (lifting more, climbing stairs easily)",
        "More energy through the day",
        "Sleeping better",
        "Healthy habits that have stuck",
        "Better health reports (sugar / thyroid / cholesterol)",
        "Less pain",
        "Feeling calmer and less stressed"
      ],
      "other": true,
      "required": true
    },
    {
      "id": "exercise",
      "kind": "one",
      "title": "How would you prefer to exercise? (pick one)",
      "options": [
        "Group class, online live",
        "Group class, in person",
        "1:1 with a trainer, online",
        "1:1 with a trainer, in person",
        "On my own with a recording"
      ],
      "other": true,
      "required": true
    },
    {
      "id": "time",
      "kind": "one",
      "title": "On a normal weekday, how much time can you give to your health? (pick one)",
      "options": [
        "Less than 15 minutes",
        "15 to 30 minutes",
        "30 to 45 minutes",
        "45 to 60 minutes",
        "More than an hour"
      ],
      "required": true
    },
    {
      "id": "else",
      "kind": "long",
      "title": "Anything else you'd like me to know? (optional)",
      "required": false
    },
    {
      "id": "hear",
      "kind": "one",
      "title": "Would you like to hear more about the programme when I launch it next year?",
      "options": ["Yes, please share details", "Maybe, keep me posted", "No, thanks"],
      "required": true
    }
  ],
  "contact": {
    "after": "hear",
    "skipOn": ["No, thanks"],
    "title": "Stay in touch",
    "help": "Leave your name and WhatsApp number and I'll message you when the programme opens. I'll use them only for that, and I won't share them with anyone.",
    "fields": [
      { "id": "name", "kind": "line", "title": "Your name", "required": false },
      { "id": "phone", "kind": "line", "title": "Your WhatsApp number", "required": false }
    ]
  }
};

function makeSurvey() {
  var form = FormApp.create(SURVEY.title);
  form.setDescription(SURVEY.intro);
  form.setConfirmationMessage(SURVEY.thanks);
  form.setCollectEmail(false);
  form.setShowLinkToRespondAgain(false);

  // A work or school Google account makes forms that only colleagues can open.
  // An ordinary account has no such setting and may refuse the call, hence the try.
  try {
    form.setRequireLogin(false);
  } catch (e) {}

  var asked = {};
  SURVEY.questions.forEach(function (q) {
    asked[q.id] = addQuestion(form, q);
  });

  // The name and the number sit on a second page that "No, thanks" never opens.
  // The page has to exist before the answers can point at it, so the question
  // that leads there is made first and given its answers afterwards.
  var contact = SURVEY.contact;
  var page = form.addPageBreakItem();
  page.setTitle(contact.title);
  page.setHelpText(contact.help);

  var leads = asked[contact.after];
  var options = questionById(contact.after).options;
  leads.setChoices(
    options.map(function (option) {
      return contact.skipOn.indexOf(option) === -1
        ? leads.createChoice(option, page)
        : leads.createChoice(option, FormApp.PageNavigationType.SUBMIT);
    })
  );

  contact.fields.forEach(function (field) {
    addQuestion(form, field);
  });

  var answers = SpreadsheetApp.create(SURVEY.title + " (answers)");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, answers.getId());

  // Newer forms can exist unpublished. Older ones have no such switch.
  try {
    if (typeof form.setPublished === "function") form.setPublished(true);
  } catch (e) {}

  var link = form.getPublishedUrl();
  try {
    link = form.shortenFormUrl(link);
  } catch (e) {}

  Logger.log("Send this link:   " + link);
  Logger.log("Change the form:  " + form.getEditUrl());
  Logger.log("Read the answers: " + answers.getUrl());
}

function questionById(id) {
  for (var i = 0; i < SURVEY.questions.length; i++) {
    if (SURVEY.questions[i].id === id) return SURVEY.questions[i];
  }
  throw new Error("No question called " + id);
}

function addQuestion(form, q) {
  var item;
  if (q.kind === "one") {
    item = form.addMultipleChoiceItem();
    item.setChoiceValues(q.options);
    if (q.other) item.showOtherOption(true);
  } else if (q.kind === "many") {
    item = form.addCheckboxItem();
    item.setChoiceValues(q.options);
    if (q.other) item.showOtherOption(true);
    if (q.max) {
      item.setValidation(FormApp.createCheckboxValidation().requireSelectAtMost(q.max).build());
    }
  } else if (q.kind === "line") {
    item = form.addTextItem();
  } else {
    item = form.addParagraphTextItem();
  }
  item.setTitle(q.title);
  if (q.help) item.setHelpText(q.help);
  item.setRequired(q.required === true);
  return item;
}
