const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

const topicTagMatchers = {
  Arrays: ["Array"],
  Strings: ["String"],
  "Linked List": ["Linked List"],
  "Sliding Window": ["Sliding Window"],
  "Dynamic Programming": ["Dynamic Programming"],
  Graphs: [
    "Graph",
    "Depth-First Search",
    "Breadth-First Search",
    "Topological Sort",
    "Shortest Path",
  ],
};

const topicTagSlugs = {
  Arrays: "array",
  Strings: "string",
  "Linked List": "linked-list",
  "Sliding Window": "sliding-window",
  "Dynamic Programming": "dynamic-programming",
  Graphs: [
    "graph",
    "depth-first-search",
    "breadth-first-search",
    "topological-sort",
    "shortest-path",
  ],
};

const topicPlans = {
  easy: ["Arrays", "Strings", "Linked List"],
  medium: ["Sliding Window", "Dynamic Programming", "Graphs"],
  hard: ["Graphs", "Arrays", "Dynamic Programming"],
};

const query = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
      total: totalNum
      questions: data {
        title
        titleSlug
        difficulty
        paidOnly: isPaidOnly
        topicTags { name }
      }
    }
  }
`;

const unavailableError = (message) => {
  const error = new Error(message);
  error.code = "CODING_PROBLEM_SOURCE_UNAVAILABLE";
  return error;
};

const getProblemPage = async ({ skip, difficulty, topicSlug }) => {
  let response;

  try {
    response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "AI-Career-Coach/1.0",
      },
      body: JSON.stringify({
        query,
        operationName: "problemsetQuestionList",
        variables: {
          categorySlug: "",
          limit: 100,
          skip,
          filters: {
            difficulty: difficulty.toUpperCase(),
            tags: [topicSlug],
          },
        },
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw unavailableError("Unable to reach LeetCode.");
  }

  if (!response.ok) {
    throw unavailableError(`LeetCode returned status ${response.status}.`);
  }

  const payload = await response.json();
  const problemList = payload?.data?.problemsetQuestionList;

  if (!problemList?.questions) {
    throw unavailableError("LeetCode returned an unexpected problem response.");
  }

  return problemList;
};

const matchesTopic = (problem, topic) => {
  const expectedTags = topicTagMatchers[topic] || [];
  const problemTags = new Set((problem.topicTags || []).map((tag) => tag.name));
  return expectedTags.some((tag) => problemTags.has(tag));
};

const selectProblem = async ({ difficulty, topic, usedSlugs }) => {
  const tagSlugs = Array.isArray(topicTagSlugs[topic])
    ? topicTagSlugs[topic]
    : [topicTagSlugs[topic]];

  for (const topicSlug of tagSlugs) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const initialPage = await getProblemPage({ skip: 0, difficulty, topicSlug });
      const maxSkip = Math.max(0, initialPage.total - 100);
      const skip = attempt === 0 ? 0 : Math.floor(Math.random() * (maxSkip + 1));
      const page = skip === 0 ? initialPage : await getProblemPage({ skip, difficulty, topicSlug });
      const candidates = page.questions.filter(
        (problem) =>
          !problem.paidOnly &&
          problem.difficulty?.toLowerCase() === difficulty &&
          matchesTopic(problem, topic) &&
          !usedSlugs.has(problem.titleSlug)
      );

      if (candidates.length) {
        return candidates[Math.floor(Math.random() * candidates.length)];
      }
    }
  }

  throw unavailableError(`No ${difficulty} ${topic} problem was available from LeetCode.`);
};

const getCodingProblems = async (difficulty) => {
  const normalizedDifficulty = difficulty?.toLowerCase();
  const topics = topicPlans[normalizedDifficulty];

  if (!topics) {
    throw new Error("Please select a valid interview difficulty.");
  }

  const usedSlugs = new Set();
  const problems = [];

  for (const [index, topic] of topics.entries()) {
    const problem = await selectProblem({
      difficulty: normalizedDifficulty,
      topic,
      usedSlugs,
    });
    usedSlugs.add(problem.titleSlug);
    problems.push({
      number: index + 1,
      codingProblem: {
        title: problem.title,
        platform: "LeetCode",
        link: `https://leetcode.com/problems/${problem.titleSlug}/`,
      },
    });
  }

  return problems;
};

export { getCodingProblems };
