import OpenAI from "openai";
import Analysis from "../models/Analysis.js";
import { getCodingProblems } from "../services/codingProblemService.js";

const dsaQuestionBank = {
  easy: [
    {
      topic: "Arrays",
      platform: "Codeforces",
      title: "Team",
      link: "https://codeforces.com/problemset/problem/231/A",
      prompt:
        "Given decisions from three teammates for each problem, count how many problems they will implement when at least two teammates are sure. Sample input: [[1,1,0],[1,1,1],[1,0,0]]. Sample output: 2. Expected approach: simple array traversal and counting.",
    },
    {
      topic: "Arrays",
      platform: "LeetCode",
      title: "Two Sum",
      link: "https://leetcode.com/problems/two-sum/",
      prompt:
        "Given an array of integers, return the indices of the two numbers whose sum equals a target value. Sample input: nums = [2, 7, 11, 15], target = 9. Sample output: [0, 1]. Constraints: Use an efficient approach better than O(n^2). Expected approach: hashing.",
    },
    {
      topic: "Strings",
      platform: "Codeforces",
      title: "Way Too Long Words",
      link: "https://codeforces.com/problemset/problem/71/A",
      prompt:
        "Given a list of words, abbreviate every word longer than 10 characters using first letter + number of omitted characters + last letter. Sample input: \"localization\". Sample output: \"l10n\". Expected approach: string manipulation.",
    },
    {
      topic: "Strings",
      platform: "LeetCode",
      title: "Valid Palindrome",
      link: "https://leetcode.com/problems/valid-palindrome/",
      prompt:
        "Given a string, determine whether it is a palindrome after ignoring spaces, punctuation, and case. Sample input: \"A man, a plan, a canal: Panama\". Sample output: true. Constraints: Solve in O(n) time. Expected approach: two pointers.",
    },
    {
      topic: "Arrays",
      platform: "LeetCode",
      title: "Remove Duplicates from Sorted Array",
      link: "https://leetcode.com/problems/remove-duplicates-from-sorted-array/",
      prompt:
        "Given a sorted array, remove duplicate elements in-place and return the number of unique elements. Sample input: [1, 1, 2, 2, 3]. Sample output: 3. Constraints: Do not use extra array storage. Expected approach: two pointers.",
    },
    {
      topic: "Hashing",
      platform: "GeeksforGeeks",
      title: "Check if Two Strings are Anagrams",
      link: "https://www.geeksforgeeks.org/check-whether-two-strings-are-anagram-of-each-other/",
      prompt:
        "Given two strings, check whether they are anagrams of each other. Sample input: s = \"listen\", t = \"silent\". Sample output: true. Constraints: Discuss an O(n) solution. Expected approach: frequency counting.",
    },
    {
      topic: "Linked List",
      platform: "LeetCode",
      title: "Reverse Linked List",
      link: "https://leetcode.com/problems/reverse-linked-list/",
      prompt:
        "Given a singly linked list, reverse it iteratively. Sample input: 1 -> 2 -> 3 -> 4. Sample output: 4 -> 3 -> 2 -> 1. Constraints: Use O(1) extra space. Expected approach: pointer reversal.",
    },
  ],
  medium: [
    {
      topic: "Sliding Window",
      platform: "Codeforces",
      title: "Books",
      link: "https://codeforces.com/problemset/problem/279/B",
      prompt:
        "Given reading times of books and total available time, find the maximum number of consecutive books that can be read. Sample input: n = 4, t = 5, books = [3,1,2,1]. Sample output: 3. Expected approach: sliding window/two pointers.",
    },
    {
      topic: "Prefix Sum",
      platform: "GeeksforGeeks",
      title: "Longest Subarray with Sum K",
      link: "https://www.geeksforgeeks.org/longest-sub-array-sum-k/",
      prompt:
        "Given an array of integers, find the length of the longest subarray with sum equal to k. Sample input: nums = [10, 5, 2, 7, 1, 9], k = 15. Sample output: 4. Constraints: Target O(n) time. Expected approach: prefix sum with hashmap.",
    },
    {
      topic: "Sliding Window",
      platform: "LeetCode",
      title: "Longest Substring Without Repeating Characters",
      link: "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
      prompt:
        "Given a string, find the length of the longest substring without repeating characters. Sample input: \"abcabcbb\". Sample output: 3. Constraints: O(n) time. Expected approach: sliding window with last-seen map.",
    },
    {
      topic: "Dynamic Programming",
      platform: "Codeforces",
      title: "Boredom",
      link: "https://codeforces.com/problemset/problem/455/A",
      prompt:
        "Given numbers, choose values to maximize points where choosing x removes x-1 and x+1. Sample input: [1,2,3]. Sample output: 4. Expected approach: dynamic programming similar to house robber.",
    },
    {
      topic: "Dynamic Programming",
      platform: "LeetCode",
      title: "Unique Paths",
      link: "https://leetcode.com/problems/unique-paths/",
      prompt:
        "Given an m x n grid, count the number of unique paths from the top-left cell to the bottom-right cell when you can only move right or down. Sample input: m = 3, n = 7. Sample output: 28. Expected approach: DP and space optimization.",
    },
    {
      topic: "Trees",
      platform: "LeetCode",
      title: "Binary Tree Level Order Traversal",
      link: "https://leetcode.com/problems/binary-tree-level-order-traversal/",
      prompt:
        "Given a binary tree, return its level order traversal. Sample input: root = [3, 9, 20, null, null, 15, 7]. Sample output: [[3], [9, 20], [15, 7]]. Expected approach: BFS with queue.",
    },
    {
      topic: "Graphs",
      platform: "Codeforces",
      title: "Kefa and Park",
      link: "https://codeforces.com/problemset/problem/580/C",
      prompt:
        "Given a tree with marked nodes and a limit m, count valid leaf paths from root where consecutive marked nodes never exceed m. Sample output depends on tree input. Expected approach: DFS on tree with state tracking.",
    },
    {
      topic: "Graphs",
      platform: "LeetCode",
      title: "Course Schedule",
      link: "https://leetcode.com/problems/course-schedule/",
      prompt:
        "Given a directed graph with n courses and prerequisite edges, determine whether all courses can be completed. Sample input: numCourses = 2, prerequisites = [[1, 0]]. Sample output: true. Expected approach: topological sorting or cycle detection.",
    },
  ],
  hard: [
    {
      topic: "Arrays",
      platform: "Codeforces",
      title: "Number of Pairs",
      link: "https://codeforces.com/problemset/problem/1538/C",
      prompt:
        "Given an array and bounds l and r, count pairs whose sum lies between l and r. Sample input: nums = [1,2,3,4], l = 4, r = 6. Sample output: 4. Expected approach: sorting with binary search or two pointers.",
    },
    {
      topic: "Arrays",
      platform: "LeetCode",
      title: "Trapping Rain Water",
      link: "https://leetcode.com/problems/trapping-rain-water/",
      prompt:
        "Given an array of non-negative integers representing bar heights, compute how much rainwater can be trapped. Sample input: [0,1,0,2,1,0,1,3,2,1,2,1]. Sample output: 6. Constraints: Solve in O(n) time and O(1) extra space. Expected approach: two pointers.",
    },
    {
      topic: "Dynamic Programming",
      platform: "Codeforces",
      title: "Flowers",
      link: "https://codeforces.com/problemset/problem/474/D",
      prompt:
        "Given multiple queries asking for the number of valid flower arrangements in length range [a,b], compute answers efficiently with a fixed block size k. Expected approach: precompute DP and prefix sums for fast range queries.",
    },
    {
      topic: "Dynamic Programming",
      platform: "LeetCode",
      title: "Word Break",
      link: "https://leetcode.com/problems/word-break/",
      prompt:
        "Given a string s and a dictionary of words, determine whether s can be segmented into dictionary words. Sample input: s = \"leetcode\", wordDict = [\"leet\", \"code\"]. Sample output: true. Expected approach: dynamic programming.",
    },
    {
      topic: "Binary Search",
      platform: "LeetCode",
      title: "Median of Two Sorted Arrays",
      link: "https://leetcode.com/problems/median-of-two-sorted-arrays/",
      prompt:
        "Given two sorted arrays, find their median without fully merging them. Sample input: nums1 = [1, 3], nums2 = [2]. Sample output: 2. Constraints: Target O(log(min(m, n))) time. Expected approach: binary search on partition.",
    },
    {
      topic: "Graphs",
      platform: "Codeforces",
      title: "Dijkstra?",
      link: "https://codeforces.com/problemset/problem/20/C",
      prompt:
        "Given an undirected weighted graph, find the shortest path from node 1 to node n or report that no path exists. Expected approach: Dijkstra's algorithm with parent reconstruction.",
    },
    {
      topic: "Graphs",
      platform: "GeeksforGeeks",
      title: "Dijkstra's Shortest Path Algorithm",
      link: "https://www.geeksforgeeks.org/dijkstras-shortest-path-algorithm-greedy-algo-7/",
      prompt:
        "Given a weighted graph with non-negative weights, find the shortest path from a source node to all other nodes. Sample input: weighted adjacency list and source = 0. Sample output: shortest distances. Expected approach: Dijkstra with priority queue.",
    },
    {
      topic: "Backtracking",
      platform: "LeetCode",
      title: "Word Search",
      link: "https://leetcode.com/problems/word-search/",
      prompt:
        "Given a 2D board of characters and a word, determine if the word exists in the grid by moving horizontally or vertically without reusing a cell. Sample input: board = [[A,B,C,E],[S,F,C,S],[A,D,E,E]], word = \"ABCCED\". Sample output: true. Expected approach: DFS backtracking.",
    },
  ],
};

const dsaTopicPlan = {
  easy: ["Arrays", "Strings", "Linked List"],
  medium: ["Sliding Window", "Dynamic Programming", "Graphs"],
  hard: ["Graphs", "Arrays", "Dynamic Programming"],
};

const pickRandomByTopic = (questions, topic, preferredPlatform = "") => {
  const matches = questions.filter((question) => question.topic === topic);
  const preferredMatches = matches.filter(
    (question) => question.platform === preferredPlatform
  );

  if (preferredMatches.length > 0) {
    return preferredMatches[Math.floor(Math.random() * preferredMatches.length)];
  }

  const pool = matches.length > 0 ? matches : questions;

  return pool[Math.floor(Math.random() * pool.length)];
};

const getFallbackCoreQuestions = (difficulty) =>
  [
    "Core Topic: OOP. Explain how inheritance, abstraction, encapsulation, and polymorphism would apply in a real service from your resume. Include one design tradeoff.",
    "Core Topic: Databases. Given one database used in your resume, explain indexing, query optimization, schema design, and one failure scenario you would handle.",
    "Core Topic: Operating Systems. Explain processes vs threads, concurrency issues, memory management, and how these concepts affect backend performance.",
    "Core Topic: System Design. Design a scalable version of one feature related to your resume. Discuss APIs, database choice, caching, load handling, and failure recovery.",
  ].map((question, index) => ({
    number: index + 4,
    question: `${difficulty.toUpperCase()} ${question}`,
  }));

const normalizeCoreTechnicalQuestions = (questions, difficulty) => {
  const validQuestions = Array.isArray(questions)
    ? questions
        .map((item) => item?.question || item)
        .filter((question) => typeof question === "string" && question.trim())
        .slice(0, 4)
    : [];

  const fallbackQuestions = getFallbackCoreQuestions(difficulty).map(
    (item) => item.question
  );

  return [...validQuestions, ...fallbackQuestions]
    .slice(0, 4)
    .map((question, index) => ({
      number: index + 4,
      question,
    }));
};

const getTechnicalQuestions = async (difficulty, coreQuestions) => {
  const codingQuestions = await getCodingProblems(difficulty);
  const coreTechnicalQuestions = normalizeCoreTechnicalQuestions(coreQuestions, difficulty);

  return [...codingQuestions, ...coreTechnicalQuestions].map((item, index) => ({
    ...item,
    number: index + 1,
  }));
};

const generateQuestions = async (req, res) => {
  let generationStage = "validating the request";

  try {
    const { analysisId, difficulty } = req.body;

    if (!analysisId || !difficulty) {
      return res.status(400).json({
        message: "Analysis ID and difficulty are required.",
      });
    }

    const validDifficulties = ["easy", "medium", "hard"];

    if (!validDifficulties.includes(difficulty.toLowerCase())) {
      return res.status(400).json({
        message: "Difficulty must be easy, medium, or hard.",
      });
    }

    const analysis = await Analysis.findById(analysisId);

    if (!analysis) {
      return res.status(404).json({
        message: "Analysis not found.",
      });
    }

    if (analysis.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Not authorized to access this analysis.",
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        message: "Groq API key is missing in server environment variables.",
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
      timeout: 30000,
      maxRetries: 1,
    });

    const hasJobDescription =
      analysis.jobDescription && analysis.jobDescription.trim() !== "";

    const prompt = `
You are a senior interview coach and technical recruiter.

Based on the candidate's resume and job description (if provided), generate interview questions.

Difficulty Level: ${difficulty.toUpperCase()}

INTERVIEW ROUND DEFINITIONS:
- The final Technical round will contain 7 questions total.
- The backend will add the first 3 Technical questions as DSA/coding problems from LeetCode, GeeksforGeeks, Codeforces-style company coding rounds.
- You must generate ONLY the remaining 4 core Technical questions in the "technicalCore" array.
- Core Technical questions should test CS fundamentals and engineering concepts from the resume/job description: OOP, DBMS, SQL/NoSQL, operating systems, computer networks, system design, APIs, backend/frontend fundamentals, debugging, scalability, and tradeoffs.
- Core Technical questions must be from 4 different subjects/topics. Do not repeat the same subject twice.
- Project-based questions must be kept only in the projectBased category.

DIFFICULTY GUIDELINES:
- EASY DSA: simple arrays, strings, hashing, basic linked lists, simple recursion
- MEDIUM DSA: sliding window, prefix sums, binary trees, graph traversal, topological sort, dynamic programming basics
- HARD DSA: one hard graph problem, one hard array problem, and one hard dynamic programming problem when possible
- EASY core: foundational OOP/DBMS/OS/networking/system design concepts from the resume
- MEDIUM core: applied scenarios, design choices, debugging, tradeoffs, and implementation reasoning
- HARD core: deeper system design, scalability, concurrency, database internals, networking/OS tradeoffs, and edge cases
- Behavioral/HR/project difficulty should still match the selected difficulty.

Return ONLY valid JSON in this EXACT format:

{
  "technicalCore": [
    { "number": 1, "question": "..." },
    { "number": 2, "question": "..." },
    { "number": 3, "question": "..." },
    { "number": 4, "question": "..." }
  ],
  "behavioral": [
    { "number": 1, "question": "..." },
    { "number": 2, "question": "..." },
    { "number": 3, "question": "..." },
    { "number": 4, "question": "..." },
    { "number": 5, "question": "..." }
  ],
  "hr": [
    { "number": 1, "question": "..." },
    { "number": 2, "question": "..." },
    { "number": 3, "question": "..." },
    { "number": 4, "question": "..." },
    { "number": 5, "question": "..." }
  ],
  "projectBased": [
    { "number": 1, "question": "..." },
    { "number": 2, "question": "..." },
    { "number": 3, "question": "..." },
    { "number": 4, "question": "..." },
    { "number": 5, "question": "..." }
  ]
}

CRITICAL RULES:
1. Generate exactly 4 technicalCore questions, 5 behavioral questions, 5 HR questions, and 5 projectBased questions.
2. technicalCore questions must be core technical interview questions, not DSA coding problems.
3. technicalCore must use 4 different subjects/topics selected from the resume/job description when possible, such as OOP, DBMS, SQL/NoSQL, OS, networking, system design, APIs, backend, frontend, cloud, security, testing, debugging, and scalability.
4. Do NOT ask project explanation, project architecture, project feature, or "tell me about your project" questions in technicalCore.
5. Do NOT ask DSA/coding problem statements in technicalCore; the backend handles the 3 DSA questions separately.
6. Behavioral questions should use the STAR format style.
7. HR questions should cover culture fit, motivation, and career goals.
8. Project-based questions must reference actual projects mentioned in the resume and should ask about architecture, implementation decisions, challenges, improvements, tradeoffs, and impact.
9. Match the difficulty level strictly.
10. If a job description is provided, align questions to the role.
11. DO NOT return any text outside the JSON.
12. Keep category boundaries strict:
    - technicalCore = 4 core CS/software engineering questions from distinct topics
    - projectBased = resume project discussion only
    - behavioral = past behavior and STAR examples
    - hr = motivation, culture fit, goals

Resume:
${analysis.resumeText}

Job Description:
${hasJobDescription ? analysis.jobDescription.trim() : "Not provided"}
`;

    generationStage = "generating the interview questions";
    const response = await openai.chat.completions.create({
      model: "openai/gpt-oss-120b",
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
      messages: [
        {
          role: "system",
          content: "You are a professional interview question generator.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
    });

    const aiText = response.choices[0].message.content;

    try {
      const cleaned = aiText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      var parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("JSON parse error from OpenAI response:");
      console.error(aiText);

      return res.status(500).json({
        message: "Failed to parse AI response.",
      });
    }

    parsed.technicalCore = parsed.technicalCore || [];
    parsed.behavioral = parsed.behavioral || [];
    parsed.hr = parsed.hr || [];
    parsed.projectBased = parsed.projectBased || [];

    generationStage = "selecting live coding problems";
    const result = {
      difficulty: difficulty.toLowerCase(),
      technical: await getTechnicalQuestions(difficulty, parsed.technicalCore),
      behavioral: parsed.behavioral,
      hr: parsed.hr,
      projectBased: parsed.projectBased,
      generatedAt: new Date().toISOString(),
    };

    return res.status(200).json({
      message: "Interview questions generated successfully.",
      interviewQuestions: result,
    });
  } catch (error) {
    console.error(`Interview Generation Error while ${generationStage}:`, error);

    if (error?.code === "CODING_PROBLEM_SOURCE_UNAVAILABLE") {
      return res.status(503).json({
        message:
          "We couldn't load coding problems from LeetCode right now. Please try again in a moment.",
      });
    }

    if (error?.status) {
      return res.status(502).json({
        message: `The AI service rejected the request while ${generationStage} (status ${error.status}). ${error.message || "Please try again."}`,
      });
    }

    return res.status(500).json({
      message: `Interview question generation failed while ${generationStage}: ${error.message || "Unknown error."}`,
    });
  }
};

const saveQuestions = async (req, res) => {
  try {
    const { analysisId, interviewQuestions } = req.body;

    if (!analysisId || !interviewQuestions) {
      return res.status(400).json({
        message: "Analysis ID and interview questions are required.",
      });
    }

    const analysis = await Analysis.findById(analysisId);

    if (!analysis) {
      return res.status(404).json({
        message: "Analysis not found.",
      });
    }

    if (analysis.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Not authorized to update this analysis.",
      });
    }

    analysis.interviewQuestions = interviewQuestions;
    await analysis.save();

    return res.status(200).json({
      message: "Interview questions saved successfully.",
    });
  } catch (error) {
    console.error("Save Interview Questions Error:", error);

    return res.status(500).json({
      message: "Failed to save interview questions.",
    });
  }
};

export { generateQuestions, saveQuestions };
