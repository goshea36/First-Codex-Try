const fmTopics = [
  "Time value of money and accumulation/discount factors",
  "Simple interest/discount and compound interest",
  "Nominal vs. effective rates and force of interest",
  "Cash-flow valuation and equation of value",
  "Annuities (immediate, due, perpetuities, varying payments)",
  "Loan amortization and sinking funds",
  "Bonds, yields, premiums/discounts, and callable features",
  "Duration, convexity, and immunization basics",
  "No-arbitrage pricing and risk-neutral valuation",
  "Forwards, futures, and swaps",
  "Option payoffs and option trading strategies",
  "Put-call parity and option bounds",
  "Binomial and Black-Scholes option pricing"
];

// Relative importance from core FM focus areas; higher = more study time.
const topicImportanceWeights = [
  1.0, 1.0, 1.1, 1.1, 1.35, 1.25, 1.3, 1.1, 1.15, 1.2, 1.4, 1.2, 1.45
];

const completedTopicIndexes = new Set();

function getEl(id) {
  return document.getElementById(id);
}

function getSelectedTopicCount() {
  const topicsInput = getEl("topics");
  const rawCount = Number(topicsInput.value);

  if (!Number.isFinite(rawCount)) {
    return 0;
  }

  const clampedCount = Math.min(Math.max(Math.floor(rawCount), 1), fmTopics.length);
  if (clampedCount !== rawCount) {
    topicsInput.value = clampedCount;
  }
  return clampedCount;
}

function getPlanningInputs() {
  return {
    examDateValue: getEl("examDate").value,
    topicCount: getSelectedTopicCount(),
    hoursPerWeek: Number(getEl("hoursPerWeek").value),
    studyDaysPerWeek: Number(getEl("studyDaysPerWeek").value)
  };
}

function calculateDaysUntilExam(examDateValue) {
  const examDate = new Date(`${examDateValue}T23:59:59`);
  const today = new Date();
  const diffTime = examDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function renderTopicList() {
  const topicCount = getSelectedTopicCount();
  const topicList = getEl("topicList");
  const finishedTopicList = getEl("finishedTopicList");
  const selectedTopics = fmTopics.slice(0, topicCount);

  topicList.innerHTML = selectedTopics
    .map((topic, index) => {
      const checked = completedTopicIndexes.has(index);
      return `
        <li>
          <input type="checkbox" id="topic-${index}" data-topic-index="${index}" ${checked ? "checked" : ""}>
          <label class="topic-label ${checked ? "completed" : ""}" for="topic-${index}">${index + 1}. ${topic}</label>
        </li>
      `;
    })
    .join("");

  const finishedTopics = selectedTopics
    .map((topic, index) => ({ topic, index }))
    .filter(({ index }) => completedTopicIndexes.has(index));

  finishedTopicList.innerHTML = finishedTopics.length
    ? finishedTopics.map(({ topic, index }) => `<li>${index + 1}. ${topic}</li>`).join("")
    : "<li>No finished topics yet.</li>";
}

function generatePlan() {
  const { examDateValue, topicCount, hoursPerWeek, studyDaysPerWeek } = getPlanningInputs();
  const output = getEl("output");
  const warning = getEl("warning");
  const allocation = getEl("allocation");
  const allocationBody = getEl("allocationBody");

  warning.textContent = "";
  output.innerHTML = "";
  allocationBody.innerHTML = "";
  allocation.hidden = true;

  if (!examDateValue || topicCount <= 0 || hoursPerWeek <= 0 || studyDaysPerWeek < 1 || studyDaysPerWeek > 7) {
    warning.textContent = "Please enter a valid exam date, topic count, weekly hours, and study days (1-7).";
    return;
  }

  const daysUntilExam = calculateDaysUntilExam(examDateValue);
  if (daysUntilExam <= 0) {
    warning.textContent = "The exam date must be in the future.";
    return;
  }

  const selectedTopics = fmTopics.slice(0, topicCount);
  const remainingAllocations = selectedTopics
    .map((topic, index) => ({ topic, index, weight: topicImportanceWeights[index] }))
    .filter(({ index }) => !completedTopicIndexes.has(index));

  const topicsLeft = remainingAllocations.length;
  const topicsFinished = topicCount - topicsLeft;

  const weeksUntilExam = daysUntilExam / 7;
  const totalStudyHours = weeksUntilExam * hoursPerWeek;
  const dailyStudyTime = hoursPerWeek / studyDaysPerWeek;

  const totalWeight = remainingAllocations.reduce((sum, item) => sum + item.weight, 0);
  const weightedAllocations = remainingAllocations.map(({ topic, index, weight }) => ({
    topic,
    index,
    weight,
    hours: totalWeight > 0 ? (weight / totalWeight) * totalStudyHours : 0
  }));

  const maxWeight = weightedAllocations.length
    ? Math.max(...weightedAllocations.map(({ weight }) => weight))
    : 0;

  const results = [
    ["Days until exam", `${daysUntilExam}`],
    ["Total study hours available", `${totalStudyHours.toFixed(1)} hours`],
    ["Suggested daily study time", `${dailyStudyTime.toFixed(1)} hours/day`],
    ["Study days per week", `${studyDaysPerWeek}`],
    ["Topics finished", `${topicsFinished}`],
    ["Topics left to study", `${topicsLeft}`],
    ["Weighting basis", topicsLeft ? `Relative importance (max ${maxWeight.toFixed(2)})` : "All selected topics completed"]
  ];

  output.innerHTML = results
    .map(([label, value]) => `
      <article class="result-item">
        <div class="result-label">${label}</div>
        <div class="result-value">${value}</div>
      </article>
    `)
    .join("");

  if (topicsLeft === 0) {
    warning.textContent = "Great job — all selected topics are marked complete.";
    return;
  }

  allocationBody.innerHTML = weightedAllocations
    .map(({ topic, index, weight, hours }) => `
      <tr>
        <td>${index + 1}. ${topic}</td>
        <td>${weight.toFixed(2)}</td>
        <td><span class="hours-chip">${hours.toFixed(1)} hrs</span></td>
      </tr>
    `)
    .join("");

  allocation.hidden = false;
}

function refreshPlanner() {
  renderTopicList();
  generatePlan();
}

function attachEventHandlers() {
  getEl("generateBtn").addEventListener("click", generatePlan);

  getEl("topicList").addEventListener("change", (event) => {
    if (!event.target.matches('input[type="checkbox"][data-topic-index]')) {
      return;
    }

    const topicIndex = Number(event.target.getAttribute("data-topic-index"));
    if (event.target.checked) {
      completedTopicIndexes.add(topicIndex);
    } else {
      completedTopicIndexes.delete(topicIndex);
    }

    refreshPlanner();
  });

  ["examDate", "topics", "hoursPerWeek", "studyDaysPerWeek"].forEach((id) => {
    getEl(id).addEventListener("input", refreshPlanner);
  });
}

attachEventHandlers();
refreshPlanner();
