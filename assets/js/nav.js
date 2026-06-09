/* ============================================================
   DevLens — nav.js
   The single source of truth for SITE NAVIGATION structure.
   Responsible for:
     • Rendering the collapsible sidebar (every page)
     • Rendering the category grid on the home page
     • Breadcrumbs + right-rail Table of Contents
     • "Concepts read" progress tracking (localStorage)
     • Mobile sidebar open/close

   NOTE: search-index.json remains the single source of truth for
   SEARCH. When you add a concept in later phases, add it here AND
   to /data/search-index.json.
   ============================================================ */
(function () {
  "use strict";

  /* ---- Root path detection -------------------------------------------
     Works whether the site is served from the domain root or a project
     subfolder (e.g. username.github.io/DevLens/). We read this script's
     own URL — it always lives at  {ROOT}assets/js/nav.js.               */
  var ROOT = (function () {
    var s = document.currentScript ||
      (function () {
        var all = document.getElementsByTagName("script");
        return all[all.length - 1];
      })();
    var src = (s && s.src) || "";
    var i = src.indexOf("assets/js/");
    return i >= 0 ? src.slice(0, i) : "";
  })();

  /* ---- SITE STRUCTURE --------------------------------------------------
     `expected` = planned total for the category (drives "x / N" + home
     counts so the roadmap is visible even before pages are written).
     `concepts` = pages that actually exist (added per phase).            */
  var SITE = {
    categories: [
      {
        id: "dotnet", slug: "dotnet", title: ".NET Internals", icon: "⚙️",
        color: "var(--cat-dotnet)", expected: 28,
        blurb: "From the CLR, GC and JIT to middleware, EF Core and minimal APIs.",
        concepts: [
          { slug: "clr", title: "The CLR" },
          { slug: "jit-compilation", title: "JIT Compilation" },
          { slug: "garbage-collection", title: "Garbage Collection" },
          { slug: "memory-management", title: "Memory Management" },
          { slug: "assemblies", title: "Assemblies & Metadata" },
          { slug: "async-await", title: "Async / Await Internals" },
          { slug: "task-vs-thread", title: "Task vs Thread" },
          { slug: "threadpool", title: "The Thread Pool" },
          { slug: "ihostedservice", title: "IHostedService" },
          { slug: "middleware-pipeline", title: "Middleware Pipeline" },
          { slug: "dependency-injection", title: "Dependency Injection" },
          { slug: "configuration", title: "Configuration System" },
          { slug: "logging", title: "Logging" },
          { slug: "health-checks", title: "Health Checks" },
          { slug: "http-client-factory", title: "HttpClientFactory" },
          { slug: "auth-pipeline", title: "Authentication & Authorization" },
          { slug: "minimal-apis", title: "Minimal APIs" },
          { slug: "ef-core-internals", title: "EF Core Internals" },
          { slug: "signalr", title: "SignalR" },
          { slug: "grpc", title: "gRPC" },
          { slug: "blazor", title: "Blazor Basics" },
          { slug: "span", title: "Span<T> & Memory<T>" },
          { slug: "records", title: "Records" },
          { slug: "nullable-reference-types", title: "Nullable Reference Types" },
          { slug: "global-usings", title: "Global Usings" },
          { slug: "pattern-matching", title: "Pattern Matching" },
          { slug: "source-generators", title: "Source Generators" },
          { slug: "aot-compilation", title: "Native AOT" }
        ]
      },
      {
        id: "csharp", slug: "csharp", title: "C# & Design Patterns", icon: "🧩",
        color: "var(--cat-csharp)", expected: 28,
        blurb: "Language deep-dives plus the key GoF patterns and modern ones.",
        concepts: [
          { slug: "singleton-pattern", title: "Singleton Pattern" },
          { slug: "factory-pattern", title: "Factory Pattern" },
          { slug: "abstract-factory", title: "Abstract Factory" },
          { slug: "builder", title: "Builder Pattern" },
          { slug: "prototype", title: "Prototype Pattern" },
          { slug: "adapter", title: "Adapter Pattern" },
          { slug: "decorator", title: "Decorator Pattern" },
          { slug: "facade", title: "Facade Pattern" },
          { slug: "proxy", title: "Proxy Pattern" },
          { slug: "composite", title: "Composite Pattern" },
          { slug: "strategy", title: "Strategy Pattern" },
          { slug: "observer", title: "Observer Pattern" },
          { slug: "command", title: "Command Pattern" },
          { slug: "template-method", title: "Template Method Pattern" },
          { slug: "state", title: "State Pattern" },
          { slug: "chain-of-responsibility", title: "Chain of Responsibility" },
          { slug: "mediator", title: "Mediator Pattern" },
          { slug: "cqrs", title: "CQRS" },
          { slug: "repository", title: "Repository Pattern" },
          { slug: "unit-of-work", title: "Unit of Work" },
          { slug: "specification", title: "Specification Pattern" },
          { slug: "delegates-events", title: "Delegates & Events" },
          { slug: "linq-internals", title: "LINQ Internals" },
          { slug: "generics", title: "Generics" },
          { slug: "variance", title: "Covariance & Contravariance" },
          { slug: "reflection", title: "Reflection & Attributes" },
          { slug: "yield-iterators", title: "yield & Iterators" },
          { slug: "extension-methods", title: "Extension Methods" }
        ]
      },
      {
        id: "database", slug: "database", title: "Database Optimization", icon: "🗄️",
        color: "var(--cat-database)", expected: 14,
        blurb: "Indexing, query plans, transactions, sharding and caching.",
        concepts: [
          { slug: "indexing", title: "Database Indexing" },
          { slug: "execution-plans", title: "Reading Execution Plans" },
          { slug: "transactions-acid", title: "Transactions & ACID" },
          { slug: "isolation-levels", title: "Isolation Levels" },
          { slug: "deadlocks", title: "Deadlocks" },
          { slug: "normalization", title: "Normalization vs Denormalization" },
          { slug: "connection-pooling", title: "Connection Pooling" },
          { slug: "sharding", title: "Partitioning & Sharding" },
          { slug: "replication", title: "Replication" },
          { slug: "caching-strategies", title: "Caching Strategies" },
          { slug: "nosql-patterns", title: "NoSQL Patterns" },
          { slug: "redis", title: "Redis Internals" },
          { slug: "sql-vs-nosql", title: "SQL vs NoSQL" },
          { slug: "stored-procedures-vs-orm", title: "Stored Procedures vs ORMs" }
        ]
      },
      {
        id: "oop", slug: "oop", title: "OOP & Principles", icon: "🏛️",
        color: "var(--cat-oop)", expected: 10,
        blurb: "The four pillars, SOLID, composition vs inheritance, DRY/KISS.",
        concepts: [
          { slug: "encapsulation", title: "Encapsulation" },
          { slug: "abstraction", title: "Abstraction" },
          { slug: "inheritance", title: "Inheritance" },
          { slug: "polymorphism", title: "Polymorphism" },
          { slug: "solid", title: "SOLID Principles" },
          { slug: "composition-vs-inheritance", title: "Composition vs Inheritance" },
          { slug: "abstract-vs-interface", title: "Abstract Class vs Interface" },
          { slug: "coupling-cohesion", title: "Coupling & Cohesion" },
          { slug: "law-of-demeter", title: "Law of Demeter" },
          { slug: "dry-kiss-yagni", title: "DRY, KISS & YAGNI" }
        ]
      },
      {
        id: "microservices", slug: "microservices", title: "Microservices", icon: "🔗",
        color: "var(--cat-microservices)", expected: 14,
        blurb: "Gateways, saga & outbox, circuit breakers, tracing, Docker/K8s.",
        concepts: [
          { slug: "monolith-vs-microservices", title: "Monolith vs Microservices" },
          { slug: "api-gateway", title: "API Gateway" },
          { slug: "service-discovery", title: "Service Discovery" },
          { slug: "inter-service-comms", title: "Inter-Service Communication" },
          { slug: "event-driven", title: "Event-Driven Architecture" },
          { slug: "saga-pattern", title: "Saga Pattern" },
          { slug: "outbox-pattern", title: "Outbox Pattern" },
          { slug: "circuit-breaker", title: "Circuit Breaker" },
          { slug: "retry-bulkhead", title: "Retry, Timeout & Bulkhead" },
          { slug: "distributed-tracing", title: "Distributed Tracing" },
          { slug: "centralized-logging", title: "Centralized Logging" },
          { slug: "docker", title: "Docker & Containers" },
          { slug: "kubernetes", title: "Kubernetes Concepts" },
          { slug: "dotnet-microservices", title: "Microservices with .NET" }
        ]
      },
      {
        id: "system-design", slug: "system-design", title: "System Design", icon: "🛰️",
        color: "var(--cat-system-design)", expected: 13,
        blurb: "Sessions, JWT, OAuth, CDNs, queues, CAP, and real product breakdowns.",
        concepts: [
          { slug: "sessions", title: "How Sessions Work" },
          { slug: "load-balancers", title: "Load Balancers & Reverse Proxies" },
          { slug: "cdn", title: "CDNs" },
          { slug: "caching", title: "Caching at Scale" },
          { slug: "message-queues", title: "Message Queues" },
          { slug: "rate-limiting", title: "Rate Limiting Algorithms" },
          { slug: "consistent-hashing", title: "Consistent Hashing" },
          { slug: "cap-theorem", title: "CAP Theorem" },
          { slug: "horizontal-vs-vertical-scaling", title: "Horizontal vs Vertical Scaling" },
          { slug: "how-twitter-timeline", title: "How Twitter's Timeline Works" },
          { slug: "how-instagram-feed", title: "How Instagram's Feed Works" },
          { slug: "how-netflix-streaming", title: "How Netflix Streaming Works" },
          { slug: "how-gmail", title: "How Gmail Works" }
        ]
      },
      {
        id: "coding-problems", slug: "coding-problems", title: "Coding Problems", icon: "🧠",
        color: "var(--cat-coding-problems)", expected: 300,
        blurb: "The most-asked interview problems: approach, C# solution, complexity.",
        concepts: [
          { slug: "two-sum", title: "Two Sum" },
          { slug: "contains-duplicate", title: "Contains Duplicate" },
          { slug: "maximum-subarray", title: "Maximum Subarray" },
          { slug: "product-of-array-except-self", title: "Product of Array Except Self" },
          { slug: "valid-palindrome", title: "Valid Palindrome" },
          { slug: "3sum", title: "3Sum" },
          { slug: "longest-substring-without-repeating", title: "Longest Substring Without Repeating" },
          { slug: "best-time-to-buy-sell-stock", title: "Best Time to Buy and Sell Stock" },
          { slug: "valid-parentheses", title: "Valid Parentheses" },
          { slug: "min-stack", title: "Min Stack" },
          { slug: "valid-anagram", title: "Valid Anagram" },
          { slug: "group-anagrams", title: "Group Anagrams" },
          { slug: "reverse-linked-list", title: "Reverse Linked List" },
          { slug: "linked-list-cycle", title: "Linked List Cycle" },
          { slug: "merge-two-sorted-lists", title: "Merge Two Sorted Lists" },
          { slug: "binary-search", title: "Binary Search" },
          { slug: "search-rotated-sorted-array", title: "Search in Rotated Sorted Array" },
          { slug: "kth-largest-element", title: "Kth Largest Element" },
          { slug: "invert-binary-tree", title: "Invert Binary Tree" },
          { slug: "max-depth-binary-tree", title: "Maximum Depth of Binary Tree" },
          { slug: "validate-bst", title: "Validate BST" },
          { slug: "level-order-traversal", title: "Binary Tree Level Order Traversal" },
          { slug: "number-of-islands", title: "Number of Islands" },
          { slug: "course-schedule", title: "Course Schedule" },
          { slug: "subsets", title: "Subsets" },
          { slug: "combination-sum", title: "Combination Sum" },
          { slug: "climbing-stairs", title: "Climbing Stairs" },
          { slug: "coin-change", title: "Coin Change" },
          { slug: "house-robber", title: "House Robber" },
          { slug: "single-number", title: "Single Number" },
          { slug: "pow-x-n", title: "Pow(x, n)" },
          { slug: "container-with-most-water", title: "Container With Most Water" },
          { slug: "trapping-rain-water", title: "Trapping Rain Water" },
          { slug: "top-k-frequent-elements", title: "Top K Frequent Elements" },
          { slug: "longest-consecutive-sequence", title: "Longest Consecutive Sequence" },
          { slug: "merge-intervals", title: "Merge Intervals" },
          { slug: "insert-interval", title: "Insert Interval" },
          { slug: "remove-nth-node-from-end", title: "Remove Nth Node From End" },
          { slug: "reorder-list", title: "Reorder List" },
          { slug: "add-two-numbers", title: "Add Two Numbers" },
          { slug: "same-tree", title: "Same Tree" },
          { slug: "lowest-common-ancestor-bst", title: "Lowest Common Ancestor of a BST" },
          { slug: "diameter-of-binary-tree", title: "Diameter of Binary Tree" },
          { slug: "clone-graph", title: "Clone Graph" },
          { slug: "rotting-oranges", title: "Rotting Oranges" },
          { slug: "jump-game", title: "Jump Game" },
          { slug: "longest-repeating-character-replacement", title: "Longest Repeating Character Replacement" },
          { slug: "permutation-in-string", title: "Permutation in String" },
          { slug: "minimum-window-substring", title: "Minimum Window Substring" },
          { slug: "search-2d-matrix", title: "Search a 2D Matrix" },
          { slug: "koko-eating-bananas", title: "Koko Eating Bananas" },
          { slug: "find-minimum-rotated-sorted-array", title: "Find Minimum in Rotated Sorted Array" },
          { slug: "evaluate-reverse-polish-notation", title: "Evaluate Reverse Polish Notation" },
          { slug: "generate-parentheses", title: "Generate Parentheses" },
          { slug: "daily-temperatures", title: "Daily Temperatures" },
          { slug: "permutations", title: "Permutations" },
          { slug: "word-search", title: "Word Search" },
          { slug: "palindrome-partitioning", title: "Palindrome Partitioning" },
          { slug: "longest-increasing-subsequence", title: "Longest Increasing Subsequence" },
          { slug: "word-break", title: "Word Break" },
          { slug: "maximum-product-subarray", title: "Maximum Product Subarray" },
          { slug: "subtree-of-another-tree", title: "Subtree of Another Tree" },
          { slug: "symmetric-tree", title: "Symmetric Tree" },
          { slug: "balanced-binary-tree", title: "Balanced Binary Tree" },
          { slug: "binary-tree-right-side-view", title: "Binary Tree Right Side View" },
          { slug: "count-good-nodes", title: "Count Good Nodes in Binary Tree" },
          { slug: "kth-smallest-element-bst", title: "Kth Smallest Element in a BST" },
          { slug: "construct-binary-tree-preorder-inorder", title: "Construct Binary Tree from Preorder and Inorder" },
          { slug: "binary-tree-maximum-path-sum", title: "Binary Tree Maximum Path Sum" },
          { slug: "serialize-and-deserialize-binary-tree", title: "Serialize and Deserialize Binary Tree" },
          { slug: "implement-trie", title: "Implement Trie (Prefix Tree)" },
          { slug: "design-add-and-search-words", title: "Design Add and Search Words" },
          { slug: "word-search-ii", title: "Word Search II" },
          { slug: "kth-largest-element-in-a-stream", title: "Kth Largest Element in a Stream" },
          { slug: "last-stone-weight", title: "Last Stone Weight" },
          { slug: "k-closest-points-to-origin", title: "K Closest Points to Origin" },
          { slug: "task-scheduler", title: "Task Scheduler" },
          { slug: "design-twitter", title: "Design Twitter" },
          { slug: "find-median-from-data-stream", title: "Find Median from Data Stream" },
          { slug: "subsets-ii", title: "Subsets II" },
          { slug: "combination-sum-ii", title: "Combination Sum II" },
          { slug: "letter-combinations-of-a-phone-number", title: "Letter Combinations of a Phone Number" },
          { slug: "n-queens", title: "N-Queens" },
          { slug: "jump-game-ii", title: "Jump Game II" },
          { slug: "gas-station", title: "Gas Station" },
          { slug: "hand-of-straights", title: "Hand of Straights" },
          { slug: "partition-labels", title: "Partition Labels" },
          { slug: "valid-parenthesis-string", title: "Valid Parenthesis String" },
          { slug: "non-overlapping-intervals", title: "Non-overlapping Intervals" },
          { slug: "meeting-rooms", title: "Meeting Rooms" },
          { slug: "meeting-rooms-ii", title: "Meeting Rooms II" },
          { slug: "number-of-1-bits", title: "Number of 1 Bits" },
          { slug: "counting-bits", title: "Counting Bits" },
          { slug: "reverse-bits", title: "Reverse Bits" },
          { slug: "missing-number", title: "Missing Number" },
          { slug: "sum-of-two-integers", title: "Sum of Two Integers" },
          { slug: "reverse-integer", title: "Reverse Integer" },
          { slug: "house-robber-ii", title: "House Robber II" },
          { slug: "longest-palindromic-substring", title: "Longest Palindromic Substring" },
          { slug: "palindromic-substrings", title: "Palindromic Substrings" },
          { slug: "decode-ways", title: "Decode Ways" },
          { slug: "unique-paths", title: "Unique Paths" },
          { slug: "longest-common-subsequence", title: "Longest Common Subsequence" },
          { slug: "edit-distance", title: "Edit Distance" },
          { slug: "coin-change-ii", title: "Coin Change II" },
          { slug: "target-sum", title: "Target Sum" },
          { slug: "best-time-to-buy-sell-cooldown", title: "Best Time to Buy and Sell Stock with Cooldown" },
          { slug: "interleaving-string", title: "Interleaving String" },
          { slug: "network-delay-time", title: "Network Delay Time" },
          { slug: "cheapest-flights-k-stops", title: "Cheapest Flights Within K Stops" },
          { slug: "reconstruct-itinerary", title: "Reconstruct Itinerary" },
          { slug: "min-cost-connect-points", title: "Min Cost to Connect All Points" },
          { slug: "swim-in-rising-water", title: "Swim in Rising Water" },
          { slug: "alien-dictionary", title: "Alien Dictionary" },
          { slug: "pacific-atlantic", title: "Pacific Atlantic Water Flow" },
          { slug: "surrounded-regions", title: "Surrounded Regions" },
          { slug: "course-schedule-ii", title: "Course Schedule II" },
          { slug: "redundant-connection", title: "Redundant Connection" },
          { slug: "number-of-connected-components", title: "Number of Connected Components" },
          { slug: "graph-valid-tree", title: "Graph Valid Tree" },
          { slug: "word-ladder", title: "Word Ladder" },
          { slug: "walls-and-gates", title: "Walls and Gates" },
          { slug: "palindrome-linked-list", title: "Palindrome Linked List" },
          { slug: "merge-k-sorted-lists", title: "Merge K Sorted Lists" },
          { slug: "reverse-nodes-in-k-group", title: "Reverse Nodes in k-Group" },
          { slug: "copy-list-with-random-pointer", title: "Copy List with Random Pointer" },
          { slug: "lru-cache", title: "LRU Cache" },
          { slug: "two-sum-ii", title: "Two Sum II - Input Array Is Sorted" },
          { slug: "remove-duplicates-from-sorted-array", title: "Remove Duplicates from Sorted Array" },
          { slug: "4sum", title: "4Sum" },
          { slug: "car-fleet", title: "Car Fleet" },
          { slug: "largest-rectangle-in-histogram", title: "Largest Rectangle in Histogram" },
          { slug: "time-based-key-value-store", title: "Time Based Key-Value Store" },
          { slug: "median-of-two-sorted-arrays", title: "Median of Two Sorted Arrays" },
          { slug: "sliding-window-maximum", title: "Sliding Window Maximum" },
          { slug: "partition-equal-subset-sum", title: "Partition Equal Subset Sum" },
          { slug: "happy-number", title: "Happy Number" },
          { slug: "plus-one", title: "Plus One" },
          { slug: "multiply-strings", title: "Multiply Strings" },
          { slug: "majority-element", title: "Majority Element" },
          { slug: "merge-sorted-array", title: "Merge Sorted Array" },
          { slug: "remove-element", title: "Remove Element" },
          { slug: "move-zeroes", title: "Move Zeroes" },
          { slug: "sort-colors", title: "Sort Colors" },
          { slug: "rotate-array", title: "Rotate Array" },
          { slug: "find-the-duplicate-number", title: "Find the Duplicate Number" },
          { slug: "set-matrix-zeroes", title: "Set Matrix Zeroes" },
          { slug: "spiral-matrix", title: "Spiral Matrix" },
          { slug: "rotate-image", title: "Rotate Image" },
          { slug: "subarray-sum-equals-k", title: "Subarray Sum Equals K" },
          { slug: "valid-sudoku", title: "Valid Sudoku" },
          { slug: "encode-and-decode-strings", title: "Encode and Decode Strings" },
          { slug: "longest-common-prefix", title: "Longest Common Prefix" },
          { slug: "roman-to-integer", title: "Roman to Integer" },
          { slug: "string-to-integer-atoi", title: "String to Integer (atoi)" },
          { slug: "find-index-of-first-occurrence", title: "Find the Index of the First Occurrence" },
          { slug: "minimum-size-subarray-sum", title: "Minimum Size Subarray Sum" },
          { slug: "find-all-anagrams-in-a-string", title: "Find All Anagrams in a String" },
          { slug: "decode-string", title: "Decode String" },
          { slug: "next-greater-element-ii", title: "Next Greater Element II" },
          { slug: "search-insert-position", title: "Search Insert Position" },
          { slug: "find-first-and-last-position", title: "Find First and Last Position of Element in Sorted Array" },
          { slug: "find-peak-element", title: "Find Peak Element" },
          { slug: "middle-of-the-linked-list", title: "Middle of the Linked List" },
          { slug: "intersection-of-two-linked-lists", title: "Intersection of Two Linked Lists" },
          { slug: "swap-nodes-in-pairs", title: "Swap Nodes in Pairs" },
          { slug: "lowest-common-ancestor-binary-tree", title: "Lowest Common Ancestor of a Binary Tree" },
          { slug: "path-sum", title: "Path Sum" },
          { slug: "binary-tree-zigzag-level-order-traversal", title: "Binary Tree Zigzag Level Order Traversal" },
          { slug: "flatten-binary-tree-to-linked-list", title: "Flatten Binary Tree to Linked List" },
          { slug: "number-of-provinces", title: "Number of Provinces" },
          { slug: "is-graph-bipartite", title: "Is Graph Bipartite" },
          { slug: "combinations", title: "Combinations" },
          { slug: "permutations-ii", title: "Permutations II" },
          { slug: "minimum-path-sum", title: "Minimum Path Sum" },
          { slug: "unique-paths-ii", title: "Unique Paths II" },
          { slug: "maximal-square", title: "Maximal Square" },
          { slug: "perfect-squares", title: "Perfect Squares" },
          { slug: "reorganize-string", title: "Reorganize String" },
          { slug: "candy", title: "Candy" },
          { slug: "insert-delete-getrandom-o1", title: "Insert Delete GetRandom O(1)" },
          { slug: "binary-search-tree-iterator", title: "Binary Search Tree Iterator" },
          { slug: "range-sum-query-immutable", title: "Range Sum Query - Immutable" },
          { slug: "first-missing-positive", title: "First Missing Positive" },
          { slug: "find-all-numbers-disappeared-in-an-array", title: "Find All Numbers Disappeared in an Array" },
          { slug: "contains-duplicate-ii", title: "Contains Duplicate II" },
          { slug: "majority-element-ii", title: "Majority Element II" },
          { slug: "find-pivot-index", title: "Find Pivot Index" },
          { slug: "3sum-closest", title: "3Sum Closest" },
          { slug: "squares-of-a-sorted-array", title: "Squares of a Sorted Array" },
          { slug: "max-consecutive-ones-iii", title: "Max Consecutive Ones III" },
          { slug: "fruit-into-baskets", title: "Fruit Into Baskets" },
          { slug: "asteroid-collision", title: "Asteroid Collision" },
          { slug: "simplify-path", title: "Simplify Path" },
          { slug: "remove-k-digits", title: "Remove K Digits" },
          { slug: "basic-calculator-ii", title: "Basic Calculator II" },
          { slug: "sqrtx", title: "Sqrt(x)" },
          { slug: "single-element-in-a-sorted-array", title: "Single Element in a Sorted Array" },
          { slug: "capacity-to-ship-packages-within-d-days", title: "Capacity To Ship Packages Within D Days" },
          { slug: "find-k-closest-elements", title: "Find K Closest Elements" },
          { slug: "sort-list", title: "Sort List" },
          { slug: "rotate-list", title: "Rotate List" },
          { slug: "odd-even-linked-list", title: "Odd Even Linked List" },
          { slug: "remove-duplicates-from-sorted-list", title: "Remove Duplicates from Sorted List" },
          { slug: "convert-sorted-array-to-bst", title: "Convert Sorted Array to BST" },
          { slug: "minimum-depth-of-binary-tree", title: "Minimum Depth of Binary Tree" },
          { slug: "path-sum-ii", title: "Path Sum II" },
          { slug: "populating-next-right-pointers", title: "Populating Next Right Pointers in Each Node" },
          { slug: "house-robber-iii", title: "House Robber III" },
          { slug: "delete-node-in-a-bst", title: "Delete Node in a BST" },
          { slug: "flood-fill", title: "Flood Fill" },
          { slug: "accounts-merge", title: "Accounts Merge" },
          { slug: "evaluate-division", title: "Evaluate Division" },
          { slug: "open-the-lock", title: "Open the Lock" },
          { slug: "shortest-path-in-binary-matrix", title: "Shortest Path in Binary Matrix" },
          { slug: "min-cost-climbing-stairs", title: "Min Cost Climbing Stairs" },
          { slug: "triangle", title: "Triangle" },
          { slug: "longest-palindromic-subsequence", title: "Longest Palindromic Subsequence" },
          { slug: "unique-binary-search-trees", title: "Unique Binary Search Trees" },
          { slug: "minimum-arrows-to-burst-balloons", title: "Minimum Number of Arrows to Burst Balloons" },
          { slug: "reverse-string", title: "Reverse String" },
          { slug: "reverse-words-in-a-string", title: "Reverse Words in a String" },
          { slug: "valid-palindrome-ii", title: "Valid Palindrome II" },
          { slug: "is-subsequence", title: "Is Subsequence" },
          { slug: "isomorphic-strings", title: "Isomorphic Strings" },
          { slug: "ransom-note", title: "Ransom Note" },
          { slug: "first-unique-character-in-a-string", title: "First Unique Character in a String" },
          { slug: "add-strings", title: "Add Strings" },
          { slug: "add-binary", title: "Add Binary" },
          { slug: "longest-palindrome", title: "Longest Palindrome" },
          { slug: "subarray-product-less-than-k", title: "Subarray Product Less Than K" },
          { slug: "longest-substring-with-at-most-k-distinct-characters", title: "Longest Substring with At Most K Distinct Characters" },
          { slug: "max-consecutive-ones", title: "Max Consecutive Ones" },
          { slug: "summary-ranges", title: "Summary Ranges" },
          { slug: "wiggle-subsequence", title: "Wiggle Subsequence" },
          { slug: "lemonade-change", title: "Lemonade Change" },
          { slug: "first-bad-version", title: "First Bad Version" },
          { slug: "valid-perfect-square", title: "Valid Perfect Square" },
          { slug: "guess-number-higher-or-lower", title: "Guess Number Higher or Lower" },
          { slug: "search-a-2d-matrix-ii", title: "Search a 2D Matrix II" },
          { slug: "binary-tree-paths", title: "Binary Tree Paths" },
          { slug: "sum-root-to-leaf-numbers", title: "Sum Root to Leaf Numbers" },
          { slug: "path-sum-iii", title: "Path Sum III" },
          { slug: "range-sum-of-bst", title: "Range Sum of BST" },
          { slug: "average-of-levels-in-binary-tree", title: "Average of Levels in Binary Tree" },
          { slug: "minimum-absolute-difference-in-bst", title: "Minimum Absolute Difference in BST" },
          { slug: "max-area-of-island", title: "Max Area of Island" },
          { slug: "island-perimeter", title: "Island Perimeter" },
          { slug: "keys-and-rooms", title: "Keys and Rooms" },
          { slug: "minimum-height-trees", title: "Minimum Height Trees" },
          { slug: "find-the-town-judge", title: "Find the Town Judge" },
          { slug: "find-if-path-exists-in-graph", title: "Find if Path Exists in Graph" },
          { slug: "minimum-falling-path-sum", title: "Minimum Falling Path Sum" },
          { slug: "paint-house", title: "Paint House" },
          { slug: "count-square-submatrices-with-all-ones", title: "Count Square Submatrices with All Ones" },
          { slug: "delete-and-earn", title: "Delete and Earn" },
          { slug: "integer-break", title: "Integer Break" },
          { slug: "excel-sheet-column-number", title: "Excel Sheet Column Number" },
          { slug: "count-primes", title: "Count Primes" },
          { slug: "power-of-two", title: "Power of Two" },
          { slug: "sum-of-left-leaves", title: "Sum of Left Leaves" },
          { slug: "find-bottom-left-tree-value", title: "Find Bottom Left Tree Value" },
          { slug: "deepest-leaves-sum", title: "Deepest Leaves Sum" },
          { slug: "find-largest-value-in-each-tree-row", title: "Find Largest Value in Each Tree Row" },
          { slug: "search-in-a-bst", title: "Search in a Binary Search Tree" },
          { slug: "binary-tree-tilt", title: "Binary Tree Tilt" },
          { slug: "insert-into-a-bst", title: "Insert into a Binary Search Tree" },
          { slug: "trim-a-binary-search-tree", title: "Trim a Binary Search Tree" },
          { slug: "third-maximum-number", title: "Third Maximum Number" },
          { slug: "maximum-product-of-three-numbers", title: "Maximum Product of Three Numbers" },
          { slug: "degree-of-an-array", title: "Degree of an Array" },
          { slug: "running-sum-of-1d-array", title: "Running Sum of 1d Array" },
          { slug: "reverse-vowels-of-a-string", title: "Reverse Vowels of a String" },
          { slug: "find-all-duplicates-in-an-array", title: "Find All Duplicates in an Array" },
          { slug: "set-mismatch", title: "Set Mismatch" },
          { slug: "remove-linked-list-elements", title: "Remove Linked List Elements" },
          { slug: "partition-list", title: "Partition List" },
          { slug: "delete-the-middle-node-of-a-linked-list", title: "Delete the Middle Node of a Linked List" },
          { slug: "add-two-numbers-ii", title: "Add Two Numbers II" },
          { slug: "single-number-ii", title: "Single Number II" },
          { slug: "hamming-distance", title: "Hamming Distance" },
          { slug: "fizz-buzz", title: "Fizz Buzz" },
          { slug: "add-digits", title: "Add Digits" },
          { slug: "ugly-number", title: "Ugly Number" },
          { slug: "baseball-game", title: "Baseball Game" },
          { slug: "remove-all-adjacent-duplicates-in-string", title: "Remove All Adjacent Duplicates In String" },
          { slug: "minimum-remove-to-make-valid-parentheses", title: "Minimum Remove to Make Valid Parentheses" },
          { slug: "backspace-string-compare", title: "Backspace String Compare" },
          { slug: "assign-cookies", title: "Assign Cookies" },
          { slug: "boats-to-save-people", title: "Boats to Save People" },
          { slug: "maximum-average-subarray-i", title: "Maximum Average Subarray I" },
          { slug: "number-of-enclaves", title: "Number of Enclaves" },
          { slug: "all-paths-from-source-to-target", title: "All Paths From Source to Target" },
          { slug: "length-of-last-word", title: "Length of Last Word" },
          { slug: "detect-capital", title: "Detect Capital" },
          { slug: "arithmetic-slices", title: "Arithmetic Slices" },
          { slug: "next-greater-element-i", title: "Next Greater Element I" },
          { slug: "peak-index-in-a-mountain-array", title: "Peak Index in a Mountain Array" },
          { slug: "maximum-length-of-pair-chain", title: "Maximum Length of Pair Chain" },
          { slug: "01-matrix", title: "01 Matrix" },
        ]
      },
      {
        id: "web-fundamentals", slug: "web-fundamentals", title: "Web Fundamentals", icon: "🌐",
        color: "var(--cat-web-fundamentals)", expected: 12,
        blurb: "HTTP, cookies, CORS, WebSockets, JWT and the OAuth handshake.",
        concepts: [
          { slug: "http", title: "HTTP Fundamentals" },
          { slug: "http-status-codes", title: "HTTP Status Codes" },
          { slug: "rest", title: "REST API Design" },
          { slug: "https-tls", title: "HTTPS & TLS" },
          { slug: "dns", title: "How DNS Works" },
          { slug: "cookies", title: "How Cookies Work" },
          { slug: "jwt", title: "JWT & Stateless Auth" },
          { slug: "oauth", title: "OAuth 2.0 & OIDC" },
          { slug: "cors", title: "CORS" },
          { slug: "websockets", title: "WebSockets vs Polling vs SSE" },
          { slug: "http-caching", title: "HTTP Caching" },
          { slug: "content-negotiation", title: "Content Negotiation" }
        ]
      }
    ]
  };

  /* ---- Helpers --------------------------------------------------------- */
  function conceptHref(catSlug, conceptSlug) {
    return ROOT + "concepts/" + catSlug + "/" + conceptSlug + ".html";
  }
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function totalExpected() {
    return SITE.categories.reduce(function (s, c) { return s + (c.expected || 0); }, 0);
  }

  /* ---- Progress (localStorage) ---------------------------------------- */
  var PROGRESS_KEY = "devlens-read";
  function readSet() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveSet(set) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(set)); } catch (e) {}
  }
  function isRead(id) { return !!readSet()[id]; }
  function setRead(id, val) {
    var set = readSet();
    if (val) set[id] = Date.now(); else delete set[id];
    saveSet(set);
    return val;
  }
  function readCount() { return Object.keys(readSet()).length; }

  /* ---- Sidebar --------------------------------------------------------- */
  function renderSidebar(mount, active) {
    mount.innerHTML = "";
    mount.appendChild(el("a", {
      class: "sidebar-head", href: ROOT + "index.html",
      style: "display:block;text-decoration:none"
    }, "Browse topics"));

    SITE.categories.forEach(function (cat) {
      var open = active && active.category === cat.id;
      var details = el("details", { class: "nav-group" });
      if (open) details.setAttribute("open", "");

      var summary = el("summary", { class: "nav-group-toggle" });
      summary.appendChild(el("span", { class: "nav-group-icon" }, cat.icon));
      summary.appendChild(el("span", { class: "nav-group-title" }, cat.title));
      summary.appendChild(el("span", { class: "nav-group-count" },
        cat.concepts.length + "/" + cat.expected));
      summary.appendChild(el("span", { class: "chevron" }, "▶"));
      details.appendChild(summary);

      var list = el("ul", { class: "nav-list" });
      if (cat.concepts.length === 0) {
        list.appendChild(el("li", { class: "empty" }, "Coming soon"));
      } else {
        cat.concepts.forEach(function (c) {
          var li = el("li");
          var a = el("a", { href: conceptHref(cat.slug, c.slug) }, c.title);
          if (active && active.category === cat.id && active.concept === c.slug) {
            a.classList.add("active");
          }
          if (isRead(cat.id + "/" + c.slug)) {
            a.appendChild(el("span", { class: "read-dot", title: "Read" }, "●"));
          }
          li.appendChild(a);
          list.appendChild(li);
        });
      }
      details.appendChild(list);
      mount.appendChild(details);
    });
  }

  /* ---- Breadcrumb ------------------------------------------------------ */
  function renderBreadcrumb(mount, active, pageTitle) {
    mount.innerHTML = "";
    function crumb(label, href, isCurrent) {
      if (isCurrent) {
        mount.appendChild(el("span", { "aria-current": "page" }, label));
      } else {
        mount.appendChild(el("a", { href: href }, label));
      }
    }
    function sep() { mount.appendChild(el("span", { class: "sep" }, "›")); }

    crumb("Home", ROOT + "index.html", false);
    if (active && active.category) {
      var cat = SITE.categories.filter(function (c) { return c.id === active.category; })[0];
      if (cat) {
        sep();
        crumb(cat.title, ROOT + "index.html#" + cat.id, false);
      }
    }
    sep();
    crumb(pageTitle || document.title, "#", true);
  }

  /* ---- Table of contents (right rail) --------------------------------- */
  function renderTOC(mount, articleSel) {
    var article = document.querySelector(articleSel || ".article");
    if (!article || !mount) return;
    var heads = article.querySelectorAll("h2, h3");
    if (!heads.length) { mount.style.display = "none"; return; }

    mount.innerHTML = "";
    mount.appendChild(el("div", { class: "toc-title" }, "On this page"));
    var ul = el("ul");
    var items = [];
    heads.forEach(function (h, i) {
      if (!h.id) h.id = "sec-" + i + "-" +
        h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      var li = el("li");
      var a = el("a", { href: "#" + h.id, class: h.tagName.toLowerCase() }, h.textContent);
      li.appendChild(a);
      ul.appendChild(li);
      items.push({ id: h.id, link: a });
    });
    mount.appendChild(ul);

    // Scroll-spy
    if ("IntersectionObserver" in window) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            items.forEach(function (it) {
              it.link.classList.toggle("active", it.id === e.target.id);
            });
          }
        });
      }, { rootMargin: "-10% 0px -75% 0px", threshold: 0 });
      heads.forEach(function (h) { spy.observe(h); });
    }
  }

  /* ---- Home: category grid + progress --------------------------------- */
  function renderHomeGrid(mount) {
    mount.innerHTML = "";
    SITE.categories.forEach(function (cat) {
      var card = el("a", {
        class: "cat-card", id: cat.id,
        href: cat.concepts.length
          ? conceptHref(cat.slug, cat.concepts[0].slug)
          : ROOT + "index.html#" + cat.id,
        style: "--cat:" + cat.color
      });
      card.appendChild(el("span", { class: "cat-icon" }, cat.icon));
      card.appendChild(el("h3", null, cat.title));
      card.appendChild(el("p", null, cat.blurb));
      var foot = el("div", { class: "cat-foot" });
      foot.appendChild(el("span", { class: "cat-count" },
        cat.concepts.length + " of " + cat.expected + " concepts"));
      foot.appendChild(el("span", null, cat.concepts.length ? "Explore →" : "Planned"));
      card.appendChild(foot);
      mount.appendChild(card);
    });
  }

  function renderProgress(mount) {
    if (!mount) return;
    var done = readCount();
    var total = totalExpected();
    var pct = total ? Math.round((done / total) * 100) : 0;
    mount.innerHTML =
      '<div class="progress-card">' +
        '<div style="font-size:1.8rem">📈</div>' +
        '<div class="pc-text">' +
          '<b>' + done + '</b> of ' + total + ' concepts read' +
          '<div class="progress-bar"><span style="width:' + pct + '%"></span></div>' +
        '</div>' +
      '</div>';
  }

  /* ---- Copy-to-clipboard for code blocks ------------------------------ */
  function wireCopyButtons() {
    document.querySelectorAll(".copy-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var block = btn.closest(".code-block");
        var pre = block && block.querySelector("pre");
        if (!pre) return;
        var text = pre.innerText;
        var done = function () {
          var old = btn.textContent;
          btn.textContent = "Copied!";
          setTimeout(function () { btn.textContent = old; }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, done);
        } else {
          var ta = document.createElement("textarea");
          ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); } catch (e) {}
          document.body.removeChild(ta); done();
        }
      });
    });
  }

  /* ---- Mobile sidebar wiring ------------------------------------------ */
  function wireChrome() {
    var body = document.body;
    var toggle = document.querySelector("[data-menu-toggle]");
    var scrim = document.querySelector(".scrim");
    if (toggle) toggle.addEventListener("click", function () {
      body.classList.toggle("nav-open");
    });
    if (scrim) scrim.addEventListener("click", function () {
      body.classList.remove("nav-open");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") body.classList.remove("nav-open");
    });
  }

  /* ---- Per-concept "Mark as read" toggle ------------------------------ */
  function wireReadToggle(active) {
    var btn = document.querySelector("[data-read-toggle]");
    if (!btn || !active || !active.category || !active.concept) return;
    var id = active.category + "/" + active.concept;
    function paint() {
      var on = isRead(id);
      btn.classList.toggle("is-read", on);
      btn.innerHTML = on ? "✓ Marked as read" : "○ Mark as read";
    }
    btn.addEventListener("click", function () { setRead(id, !isRead(id)); paint(); });
    paint();
  }

  /* ---- Public API + auto-init ----------------------------------------- */
  window.DevLensNav = {
    ROOT: ROOT,
    SITE: SITE,
    conceptHref: conceptHref,
    isRead: isRead,
    setRead: setRead,
    readCount: readCount,
    totalExpected: totalExpected,
    renderSidebar: renderSidebar,
    renderBreadcrumb: renderBreadcrumb,
    renderTOC: renderTOC,
    renderHomeGrid: renderHomeGrid,
    renderProgress: renderProgress
  };

  function init() {
    wireChrome();
    wireCopyButtons();

    // Read the page's declared context from <body data-...>.
    var b = document.body;
    var active = {
      category: b.getAttribute("data-category") || null,
      concept: b.getAttribute("data-concept") || null
    };

    var sidebar = document.getElementById("sidebar");
    if (sidebar) renderSidebar(sidebar, active);

    var crumb = document.querySelector(".breadcrumb");
    if (crumb) renderBreadcrumb(crumb, active, b.getAttribute("data-title"));

    var toc = document.getElementById("toc");
    if (toc) renderTOC(toc);

    var grid = document.getElementById("categoryGrid");
    if (grid) renderHomeGrid(grid);

    var prog = document.getElementById("homeProgress");
    if (prog) renderProgress(prog);

    wireReadToggle(active);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
