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
        color: "var(--cat-coding-problems)", expected: 350,
        blurb: "The most-asked interview problems: approach, C# solution, complexity.",
        concepts: [
          { slug: "two-sum", title: "Two Sum" },
          { slug: "contains-duplicate", title: "Contains Duplicate" },
          { slug: "product-of-array-except-self", title: "Product of Array Except Self" },
          { slug: "valid-anagram", title: "Valid Anagram" },
          { slug: "group-anagrams", title: "Group Anagrams" },
          { slug: "top-k-frequent-elements", title: "Top K Frequent Elements" },
          { slug: "longest-consecutive-sequence", title: "Longest Consecutive Sequence" },
          { slug: "majority-element", title: "Majority Element" },
          { slug: "rotate-array", title: "Rotate Array" },
          { slug: "subarray-sum-equals-k", title: "Subarray Sum Equals K" },
          { slug: "valid-sudoku", title: "Valid Sudoku" },
          { slug: "encode-and-decode-strings", title: "Encode and Decode Strings" },
          { slug: "first-missing-positive", title: "First Missing Positive" },
          { slug: "find-all-numbers-disappeared-in-an-array", title: "Find All Numbers Disappeared in an Array" },
          { slug: "contains-duplicate-ii", title: "Contains Duplicate II" },
          { slug: "majority-element-ii", title: "Majority Element II" },
          { slug: "find-pivot-index", title: "Find Pivot Index" },
          { slug: "third-maximum-number", title: "Third Maximum Number" },
          { slug: "maximum-product-of-three-numbers", title: "Maximum Product of Three Numbers" },
          { slug: "degree-of-an-array", title: "Degree of an Array" },
          { slug: "running-sum-of-1d-array", title: "Running Sum of 1d Array" },
          { slug: "find-all-duplicates-in-an-array", title: "Find All Duplicates in an Array" },
          { slug: "set-mismatch", title: "Set Mismatch" },
          { slug: "longest-common-prefix", title: "Longest Common Prefix" },
          { slug: "find-index-of-first-occurrence", title: "Find the Index of the First Occurrence" },
          { slug: "reverse-words-in-a-string", title: "Reverse Words in a String" },
          { slug: "isomorphic-strings", title: "Isomorphic Strings" },
          { slug: "ransom-note", title: "Ransom Note" },
          { slug: "first-unique-character-in-a-string", title: "First Unique Character in a String" },
          { slug: "longest-palindrome", title: "Longest Palindrome" },
          { slug: "length-of-last-word", title: "Length of Last Word" },
          { slug: "detect-capital", title: "Detect Capital" },
          { slug: "summary-ranges", title: "Summary Ranges" },
          { slug: "remove-element", title: "Remove Element" },
          { slug: "range-sum-query-immutable", title: "Range Sum Query - Immutable" },
          { slug: "insert-delete-getrandom-o1", title: "Insert Delete GetRandom O(1)" },
          { slug: "valid-palindrome", title: "Valid Palindrome" },
          { slug: "3sum", title: "3Sum" },
          { slug: "container-with-most-water", title: "Container With Most Water" },
          { slug: "trapping-rain-water", title: "Trapping Rain Water" },
          { slug: "two-sum-ii", title: "Two Sum II - Input Array Is Sorted" },
          { slug: "remove-duplicates-from-sorted-array", title: "Remove Duplicates from Sorted Array" },
          { slug: "4sum", title: "4Sum" },
          { slug: "3sum-closest", title: "3Sum Closest" },
          { slug: "squares-of-a-sorted-array", title: "Squares of a Sorted Array" },
          { slug: "merge-sorted-array", title: "Merge Sorted Array" },
          { slug: "move-zeroes", title: "Move Zeroes" },
          { slug: "sort-colors", title: "Sort Colors" },
          { slug: "find-the-duplicate-number", title: "Find the Duplicate Number" },
          { slug: "reverse-string", title: "Reverse String" },
          { slug: "valid-palindrome-ii", title: "Valid Palindrome II" },
          { slug: "is-subsequence", title: "Is Subsequence" },
          { slug: "reverse-vowels-of-a-string", title: "Reverse Vowels of a String" },
          { slug: "sort-array-by-parity", title: "Sort Array By Parity" },
          { slug: "intersection-of-two-arrays-ii", title: "Intersection of Two Arrays II" },
          { slug: "boats-to-save-people", title: "Boats to Save People" },
          { slug: "backspace-string-compare", title: "Backspace String Compare" },
          { slug: "longest-substring-without-repeating", title: "Longest Substring Without Repeating" },
          { slug: "best-time-to-buy-sell-stock", title: "Best Time to Buy and Sell Stock" },
          { slug: "longest-repeating-character-replacement", title: "Longest Repeating Character Replacement" },
          { slug: "permutation-in-string", title: "Permutation in String" },
          { slug: "minimum-window-substring", title: "Minimum Window Substring" },
          { slug: "sliding-window-maximum", title: "Sliding Window Maximum" },
          { slug: "minimum-size-subarray-sum", title: "Minimum Size Subarray Sum" },
          { slug: "find-all-anagrams-in-a-string", title: "Find All Anagrams in a String" },
          { slug: "max-consecutive-ones-iii", title: "Max Consecutive Ones III" },
          { slug: "fruit-into-baskets", title: "Fruit Into Baskets" },
          { slug: "subarray-product-less-than-k", title: "Subarray Product Less Than K" },
          { slug: "longest-substring-with-at-most-k-distinct-characters", title: "Longest Substring with At Most K Distinct Characters" },
          { slug: "max-consecutive-ones", title: "Max Consecutive Ones" },
          { slug: "maximum-average-subarray-i", title: "Maximum Average Subarray I" },
          { slug: "minimum-operations-to-reduce-x-to-zero", title: "Minimum Operations to Reduce X to Zero" },
          { slug: "get-equal-substrings-within-budget", title: "Get Equal Substrings Within Budget" },
          { slug: "longest-subarray-of-1s-after-deleting-one", title: "Longest Subarray of 1's After Deleting One Element" },
          { slug: "valid-parentheses", title: "Valid Parentheses" },
          { slug: "min-stack", title: "Min Stack" },
          { slug: "evaluate-reverse-polish-notation", title: "Evaluate Reverse Polish Notation" },
          { slug: "generate-parentheses", title: "Generate Parentheses" },
          { slug: "daily-temperatures", title: "Daily Temperatures" },
          { slug: "car-fleet", title: "Car Fleet" },
          { slug: "largest-rectangle-in-histogram", title: "Largest Rectangle in Histogram" },
          { slug: "decode-string", title: "Decode String" },
          { slug: "next-greater-element-ii", title: "Next Greater Element II" },
          { slug: "asteroid-collision", title: "Asteroid Collision" },
          { slug: "simplify-path", title: "Simplify Path" },
          { slug: "remove-k-digits", title: "Remove K Digits" },
          { slug: "basic-calculator-ii", title: "Basic Calculator II" },
          { slug: "baseball-game", title: "Baseball Game" },
          { slug: "remove-all-adjacent-duplicates-in-string", title: "Remove All Adjacent Duplicates In String" },
          { slug: "minimum-remove-to-make-valid-parentheses", title: "Minimum Remove to Make Valid Parentheses" },
          { slug: "online-stock-span", title: "Online Stock Span" },
          { slug: "validate-stack-sequences", title: "Validate Stack Sequences" },
          { slug: "removing-stars-from-a-string", title: "Removing Stars From a String" },
          { slug: "make-the-string-great", title: "Make The String Great" },
          { slug: "minimum-add-to-make-parentheses-valid", title: "Minimum Add to Make Parentheses Valid" },
          { slug: "remove-duplicate-letters", title: "Remove Duplicate Letters" },
          { slug: "next-greater-element-i", title: "Next Greater Element I" },
          { slug: "binary-search", title: "Binary Search" },
          { slug: "search-rotated-sorted-array", title: "Search in Rotated Sorted Array" },
          { slug: "search-2d-matrix", title: "Search a 2D Matrix" },
          { slug: "koko-eating-bananas", title: "Koko Eating Bananas" },
          { slug: "find-minimum-rotated-sorted-array", title: "Find Minimum in Rotated Sorted Array" },
          { slug: "time-based-key-value-store", title: "Time Based Key-Value Store" },
          { slug: "median-of-two-sorted-arrays", title: "Median of Two Sorted Arrays" },
          { slug: "search-insert-position", title: "Search Insert Position" },
          { slug: "find-first-and-last-position", title: "Find First and Last Position of Element in Sorted Array" },
          { slug: "find-peak-element", title: "Find Peak Element" },
          { slug: "sqrtx", title: "Sqrt(x)" },
          { slug: "single-element-in-a-sorted-array", title: "Single Element in a Sorted Array" },
          { slug: "capacity-to-ship-packages-within-d-days", title: "Capacity To Ship Packages Within D Days" },
          { slug: "find-k-closest-elements", title: "Find K Closest Elements" },
          { slug: "first-bad-version", title: "First Bad Version" },
          { slug: "valid-perfect-square", title: "Valid Perfect Square" },
          { slug: "guess-number-higher-or-lower", title: "Guess Number Higher or Lower" },
          { slug: "search-a-2d-matrix-ii", title: "Search a 2D Matrix II" },
          { slug: "peak-index-in-a-mountain-array", title: "Peak Index in a Mountain Array" },
          { slug: "reverse-linked-list", title: "Reverse Linked List" },
          { slug: "linked-list-cycle", title: "Linked List Cycle" },
          { slug: "merge-two-sorted-lists", title: "Merge Two Sorted Lists" },
          { slug: "remove-nth-node-from-end", title: "Remove Nth Node From End" },
          { slug: "reorder-list", title: "Reorder List" },
          { slug: "add-two-numbers", title: "Add Two Numbers" },
          { slug: "palindrome-linked-list", title: "Palindrome Linked List" },
          { slug: "merge-k-sorted-lists", title: "Merge K Sorted Lists" },
          { slug: "reverse-nodes-in-k-group", title: "Reverse Nodes in k-Group" },
          { slug: "copy-list-with-random-pointer", title: "Copy List with Random Pointer" },
          { slug: "lru-cache", title: "LRU Cache" },
          { slug: "middle-of-the-linked-list", title: "Middle of the Linked List" },
          { slug: "intersection-of-two-linked-lists", title: "Intersection of Two Linked Lists" },
          { slug: "swap-nodes-in-pairs", title: "Swap Nodes in Pairs" },
          { slug: "sort-list", title: "Sort List" },
          { slug: "rotate-list", title: "Rotate List" },
          { slug: "odd-even-linked-list", title: "Odd Even Linked List" },
          { slug: "remove-duplicates-from-sorted-list", title: "Remove Duplicates from Sorted List" },
          { slug: "remove-linked-list-elements", title: "Remove Linked List Elements" },
          { slug: "partition-list", title: "Partition List" },
          { slug: "delete-the-middle-node-of-a-linked-list", title: "Delete the Middle Node of a Linked List" },
          { slug: "add-two-numbers-ii", title: "Add Two Numbers II" },
          { slug: "invert-binary-tree", title: "Invert Binary Tree" },
          { slug: "max-depth-binary-tree", title: "Maximum Depth of Binary Tree" },
          { slug: "validate-bst", title: "Validate BST" },
          { slug: "level-order-traversal", title: "Binary Tree Level Order Traversal" },
          { slug: "same-tree", title: "Same Tree" },
          { slug: "lowest-common-ancestor-bst", title: "Lowest Common Ancestor of a BST" },
          { slug: "diameter-of-binary-tree", title: "Diameter of Binary Tree" },
          { slug: "subtree-of-another-tree", title: "Subtree of Another Tree" },
          { slug: "symmetric-tree", title: "Symmetric Tree" },
          { slug: "balanced-binary-tree", title: "Balanced Binary Tree" },
          { slug: "binary-tree-right-side-view", title: "Binary Tree Right Side View" },
          { slug: "count-good-nodes", title: "Count Good Nodes in Binary Tree" },
          { slug: "kth-smallest-element-bst", title: "Kth Smallest Element in a BST" },
          { slug: "construct-binary-tree-preorder-inorder", title: "Construct Binary Tree from Preorder and Inorder" },
          { slug: "binary-tree-maximum-path-sum", title: "Binary Tree Maximum Path Sum" },
          { slug: "serialize-and-deserialize-binary-tree", title: "Serialize and Deserialize Binary Tree" },
          { slug: "binary-search-tree-iterator", title: "Binary Search Tree Iterator" },
          { slug: "lowest-common-ancestor-binary-tree", title: "Lowest Common Ancestor of a Binary Tree" },
          { slug: "path-sum", title: "Path Sum" },
          { slug: "binary-tree-zigzag-level-order-traversal", title: "Binary Tree Zigzag Level Order Traversal" },
          { slug: "flatten-binary-tree-to-linked-list", title: "Flatten Binary Tree to Linked List" },
          { slug: "convert-sorted-array-to-bst", title: "Convert Sorted Array to BST" },
          { slug: "minimum-depth-of-binary-tree", title: "Minimum Depth of Binary Tree" },
          { slug: "path-sum-ii", title: "Path Sum II" },
          { slug: "populating-next-right-pointers", title: "Populating Next Right Pointers in Each Node" },
          { slug: "house-robber-iii", title: "House Robber III" },
          { slug: "delete-node-in-a-bst", title: "Delete Node in a BST" },
          { slug: "binary-tree-paths", title: "Binary Tree Paths" },
          { slug: "sum-root-to-leaf-numbers", title: "Sum Root to Leaf Numbers" },
          { slug: "path-sum-iii", title: "Path Sum III" },
          { slug: "range-sum-of-bst", title: "Range Sum of BST" },
          { slug: "average-of-levels-in-binary-tree", title: "Average of Levels in Binary Tree" },
          { slug: "minimum-absolute-difference-in-bst", title: "Minimum Absolute Difference in BST" },
          { slug: "sum-of-left-leaves", title: "Sum of Left Leaves" },
          { slug: "find-bottom-left-tree-value", title: "Find Bottom Left Tree Value" },
          { slug: "deepest-leaves-sum", title: "Deepest Leaves Sum" },
          { slug: "find-largest-value-in-each-tree-row", title: "Find Largest Value in Each Tree Row" },
          { slug: "search-in-a-bst", title: "Search in a Binary Search Tree" },
          { slug: "binary-tree-tilt", title: "Binary Tree Tilt" },
          { slug: "insert-into-a-bst", title: "Insert into a Binary Search Tree" },
          { slug: "trim-a-binary-search-tree", title: "Trim a Binary Search Tree" },
          { slug: "convert-bst-to-greater-tree", title: "Convert BST to Greater Tree" },
          { slug: "two-sum-iv-input-is-a-bst", title: "Two Sum IV - Input is a BST" },
          { slug: "count-complete-tree-nodes", title: "Count Complete Tree Nodes" },
          { slug: "cousins-in-binary-tree", title: "Cousins in Binary Tree" },
          { slug: "binary-tree-pruning", title: "Binary Tree Pruning" },
          { slug: "increasing-order-search-tree", title: "Increasing Order Search Tree" },
          { slug: "merge-two-binary-trees", title: "Merge Two Binary Trees" },
          { slug: "leaf-similar-trees", title: "Leaf-Similar Trees" },
          { slug: "find-mode-in-binary-search-tree", title: "Find Mode in Binary Search Tree" },
          { slug: "implement-trie", title: "Implement Trie (Prefix Tree)" },
          { slug: "design-add-and-search-words", title: "Design Add and Search Words" },
          { slug: "word-search-ii", title: "Word Search II" },
          { slug: "kth-largest-element", title: "Kth Largest Element" },
          { slug: "kth-largest-element-in-a-stream", title: "Kth Largest Element in a Stream" },
          { slug: "last-stone-weight", title: "Last Stone Weight" },
          { slug: "k-closest-points-to-origin", title: "K Closest Points to Origin" },
          { slug: "task-scheduler", title: "Task Scheduler" },
          { slug: "design-twitter", title: "Design Twitter" },
          { slug: "find-median-from-data-stream", title: "Find Median from Data Stream" },
          { slug: "sort-characters-by-frequency", title: "Sort Characters By Frequency" },
          { slug: "find-k-pairs-with-smallest-sums", title: "Find K Pairs with Smallest Sums" },
          { slug: "the-k-weakest-rows-in-a-matrix", title: "The K Weakest Rows in a Matrix" },
          { slug: "reorganize-string", title: "Reorganize String" },
          { slug: "subsets", title: "Subsets" },
          { slug: "combination-sum", title: "Combination Sum" },
          { slug: "permutations", title: "Permutations" },
          { slug: "word-search", title: "Word Search" },
          { slug: "palindrome-partitioning", title: "Palindrome Partitioning" },
          { slug: "subsets-ii", title: "Subsets II" },
          { slug: "combination-sum-ii", title: "Combination Sum II" },
          { slug: "letter-combinations-of-a-phone-number", title: "Letter Combinations of a Phone Number" },
          { slug: "n-queens", title: "N-Queens" },
          { slug: "combinations", title: "Combinations" },
          { slug: "permutations-ii", title: "Permutations II" },
          { slug: "number-of-islands", title: "Number of Islands" },
          { slug: "course-schedule", title: "Course Schedule" },
          { slug: "clone-graph", title: "Clone Graph" },
          { slug: "rotting-oranges", title: "Rotting Oranges" },
          { slug: "pacific-atlantic", title: "Pacific Atlantic Water Flow" },
          { slug: "surrounded-regions", title: "Surrounded Regions" },
          { slug: "course-schedule-ii", title: "Course Schedule II" },
          { slug: "redundant-connection", title: "Redundant Connection" },
          { slug: "number-of-connected-components", title: "Number of Connected Components" },
          { slug: "graph-valid-tree", title: "Graph Valid Tree" },
          { slug: "word-ladder", title: "Word Ladder" },
          { slug: "walls-and-gates", title: "Walls and Gates" },
          { slug: "number-of-provinces", title: "Number of Provinces" },
          { slug: "is-graph-bipartite", title: "Is Graph Bipartite" },
          { slug: "flood-fill", title: "Flood Fill" },
          { slug: "max-area-of-island", title: "Max Area of Island" },
          { slug: "island-perimeter", title: "Island Perimeter" },
          { slug: "keys-and-rooms", title: "Keys and Rooms" },
          { slug: "minimum-height-trees", title: "Minimum Height Trees" },
          { slug: "find-the-town-judge", title: "Find the Town Judge" },
          { slug: "find-if-path-exists-in-graph", title: "Find if Path Exists in Graph" },
          { slug: "number-of-enclaves", title: "Number of Enclaves" },
          { slug: "all-paths-from-source-to-target", title: "All Paths From Source to Target" },
          { slug: "possible-bipartition", title: "Possible Bipartition" },
          { slug: "find-eventual-safe-states", title: "Find Eventual Safe States" },
          { slug: "number-of-operations-to-make-network-connected", title: "Number of Operations to Make Network Connected" },
          { slug: "number-of-closed-islands", title: "Number of Closed Islands" },
          { slug: "as-far-from-land-as-possible", title: "As Far from Land as Possible" },
          { slug: "shortest-path-in-binary-matrix", title: "Shortest Path in Binary Matrix" },
          { slug: "accounts-merge", title: "Accounts Merge" },
          { slug: "open-the-lock", title: "Open the Lock" },
          { slug: "evaluate-division", title: "Evaluate Division" },
          { slug: "01-matrix", title: "01 Matrix" },
          { slug: "network-delay-time", title: "Network Delay Time" },
          { slug: "cheapest-flights-k-stops", title: "Cheapest Flights Within K Stops" },
          { slug: "reconstruct-itinerary", title: "Reconstruct Itinerary" },
          { slug: "min-cost-connect-points", title: "Min Cost to Connect All Points" },
          { slug: "swim-in-rising-water", title: "Swim in Rising Water" },
          { slug: "alien-dictionary", title: "Alien Dictionary" },
          { slug: "climbing-stairs", title: "Climbing Stairs" },
          { slug: "min-cost-climbing-stairs", title: "Min Cost Climbing Stairs" },
          { slug: "coin-change", title: "Coin Change" },
          { slug: "house-robber", title: "House Robber" },
          { slug: "house-robber-ii", title: "House Robber II" },
          { slug: "longest-increasing-subsequence", title: "Longest Increasing Subsequence" },
          { slug: "maximum-product-subarray", title: "Maximum Product Subarray" },
          { slug: "word-break", title: "Word Break" },
          { slug: "longest-palindromic-substring", title: "Longest Palindromic Substring" },
          { slug: "decode-ways", title: "Decode Ways" },
          { slug: "partition-equal-subset-sum", title: "Partition Equal Subset Sum" },
          { slug: "delete-and-earn", title: "Delete and Earn" },
          { slug: "integer-break", title: "Integer Break" },
          { slug: "n-th-tribonacci-number", title: "N-th Tribonacci Number" },
          { slug: "paint-fence", title: "Paint Fence" },
          { slug: "paint-house", title: "Paint House" },
          { slug: "maximum-sum-circular-subarray", title: "Maximum Sum Circular Subarray" },
          { slug: "minimum-cost-for-tickets", title: "Minimum Cost For Tickets" },
          { slug: "number-of-longest-increasing-subsequence", title: "Number of Longest Increasing Subsequence" },
          { slug: "arithmetic-slices", title: "Arithmetic Slices" },
          { slug: "maximum-length-of-pair-chain", title: "Maximum Length of Pair Chain" },
          { slug: "wiggle-subsequence", title: "Wiggle Subsequence" },
          { slug: "unique-binary-search-trees", title: "Unique Binary Search Trees" },
          { slug: "perfect-squares", title: "Perfect Squares" },
          { slug: "last-stone-weight-ii", title: "Last Stone Weight II" },
          { slug: "palindromic-substrings", title: "Palindromic Substrings" },
          { slug: "unique-paths", title: "Unique Paths" },
          { slug: "longest-common-subsequence", title: "Longest Common Subsequence" },
          { slug: "edit-distance", title: "Edit Distance" },
          { slug: "coin-change-ii", title: "Coin Change II" },
          { slug: "target-sum", title: "Target Sum" },
          { slug: "best-time-to-buy-sell-cooldown", title: "Best Time to Buy and Sell Stock with Cooldown" },
          { slug: "interleaving-string", title: "Interleaving String" },
          { slug: "minimum-path-sum", title: "Minimum Path Sum" },
          { slug: "unique-paths-ii", title: "Unique Paths II" },
          { slug: "maximal-square", title: "Maximal Square" },
          { slug: "triangle", title: "Triangle" },
          { slug: "longest-palindromic-subsequence", title: "Longest Palindromic Subsequence" },
          { slug: "count-square-submatrices-with-all-ones", title: "Count Square Submatrices with All Ones" },
          { slug: "minimum-falling-path-sum", title: "Minimum Falling Path Sum" },
          { slug: "uncrossed-lines", title: "Uncrossed Lines" },
          { slug: "stone-game", title: "Stone Game" },
          { slug: "predict-the-winner", title: "Predict the Winner" },
          { slug: "ones-and-zeroes", title: "Ones and Zeroes" },
          { slug: "maximum-subarray", title: "Maximum Subarray" },
          { slug: "jump-game", title: "Jump Game" },
          { slug: "jump-game-ii", title: "Jump Game II" },
          { slug: "gas-station", title: "Gas Station" },
          { slug: "hand-of-straights", title: "Hand of Straights" },
          { slug: "partition-labels", title: "Partition Labels" },
          { slug: "valid-parenthesis-string", title: "Valid Parenthesis String" },
          { slug: "candy", title: "Candy" },
          { slug: "lemonade-change", title: "Lemonade Change" },
          { slug: "assign-cookies", title: "Assign Cookies" },
          { slug: "maximum-units-on-a-truck", title: "Maximum Units on a Truck" },
          { slug: "two-city-scheduling", title: "Two City Scheduling" },
          { slug: "dota2-senate", title: "Dota2 Senate" },
          { slug: "monotone-increasing-digits", title: "Monotone Increasing Digits" },
          { slug: "can-place-flowers", title: "Can Place Flowers" },
          { slug: "minimum-cost-to-move-chips", title: "Minimum Cost to Move Chips to The Same Position" },
          { slug: "merge-intervals", title: "Merge Intervals" },
          { slug: "insert-interval", title: "Insert Interval" },
          { slug: "non-overlapping-intervals", title: "Non-overlapping Intervals" },
          { slug: "meeting-rooms", title: "Meeting Rooms" },
          { slug: "meeting-rooms-ii", title: "Meeting Rooms II" },
          { slug: "minimum-arrows-to-burst-balloons", title: "Minimum Number of Arrows to Burst Balloons" },
          { slug: "pow-x-n", title: "Pow(x, n)" },
          { slug: "reverse-integer", title: "Reverse Integer" },
          { slug: "happy-number", title: "Happy Number" },
          { slug: "plus-one", title: "Plus One" },
          { slug: "multiply-strings", title: "Multiply Strings" },
          { slug: "set-matrix-zeroes", title: "Set Matrix Zeroes" },
          { slug: "spiral-matrix", title: "Spiral Matrix" },
          { slug: "rotate-image", title: "Rotate Image" },
          { slug: "roman-to-integer", title: "Roman to Integer" },
          { slug: "string-to-integer-atoi", title: "String to Integer (atoi)" },
          { slug: "add-strings", title: "Add Strings" },
          { slug: "add-binary", title: "Add Binary" },
          { slug: "excel-sheet-column-number", title: "Excel Sheet Column Number" },
          { slug: "count-primes", title: "Count Primes" },
          { slug: "fizz-buzz", title: "Fizz Buzz" },
          { slug: "add-digits", title: "Add Digits" },
          { slug: "ugly-number", title: "Ugly Number" },
          { slug: "power-of-two", title: "Power of Two" },
          { slug: "power-of-three", title: "Power of Three" },
          { slug: "perfect-number", title: "Perfect Number" },
          { slug: "self-dividing-numbers", title: "Self Dividing Numbers" },
          { slug: "single-number", title: "Single Number" },
          { slug: "number-of-1-bits", title: "Number of 1 Bits" },
          { slug: "counting-bits", title: "Counting Bits" },
          { slug: "reverse-bits", title: "Reverse Bits" },
          { slug: "missing-number", title: "Missing Number" },
          { slug: "sum-of-two-integers", title: "Sum of Two Integers" },
          { slug: "single-number-ii", title: "Single Number II" },
          { slug: "hamming-distance", title: "Hamming Distance" },
          { slug: "find-the-difference", title: "Find the Difference" },
          { slug: "power-of-four", title: "Power of Four" },
          { slug: "number-complement", title: "Number Complement" },
        ],
        groups: [
          {
            title: "Arrays & Hashing",
            concepts: [
            { slug: "two-sum", title: "Two Sum" },
            { slug: "contains-duplicate", title: "Contains Duplicate" },
            { slug: "product-of-array-except-self", title: "Product of Array Except Self" },
            { slug: "valid-anagram", title: "Valid Anagram" },
            { slug: "group-anagrams", title: "Group Anagrams" },
            { slug: "top-k-frequent-elements", title: "Top K Frequent Elements" },
            { slug: "longest-consecutive-sequence", title: "Longest Consecutive Sequence" },
            { slug: "majority-element", title: "Majority Element" },
            { slug: "rotate-array", title: "Rotate Array" },
            { slug: "subarray-sum-equals-k", title: "Subarray Sum Equals K" },
            { slug: "valid-sudoku", title: "Valid Sudoku" },
            { slug: "encode-and-decode-strings", title: "Encode and Decode Strings" },
            { slug: "first-missing-positive", title: "First Missing Positive" },
            { slug: "find-all-numbers-disappeared-in-an-array", title: "Find All Numbers Disappeared in an Array" },
            { slug: "contains-duplicate-ii", title: "Contains Duplicate II" },
            { slug: "majority-element-ii", title: "Majority Element II" },
            { slug: "find-pivot-index", title: "Find Pivot Index" },
            { slug: "third-maximum-number", title: "Third Maximum Number" },
            { slug: "maximum-product-of-three-numbers", title: "Maximum Product of Three Numbers" },
            { slug: "degree-of-an-array", title: "Degree of an Array" },
            { slug: "running-sum-of-1d-array", title: "Running Sum of 1d Array" },
            { slug: "find-all-duplicates-in-an-array", title: "Find All Duplicates in an Array" },
            { slug: "set-mismatch", title: "Set Mismatch" },
            { slug: "longest-common-prefix", title: "Longest Common Prefix" },
            { slug: "find-index-of-first-occurrence", title: "Find the Index of the First Occurrence" },
            { slug: "reverse-words-in-a-string", title: "Reverse Words in a String" },
            { slug: "isomorphic-strings", title: "Isomorphic Strings" },
            { slug: "ransom-note", title: "Ransom Note" },
            { slug: "first-unique-character-in-a-string", title: "First Unique Character in a String" },
            { slug: "longest-palindrome", title: "Longest Palindrome" },
            { slug: "length-of-last-word", title: "Length of Last Word" },
            { slug: "detect-capital", title: "Detect Capital" },
            { slug: "summary-ranges", title: "Summary Ranges" },
            { slug: "remove-element", title: "Remove Element" },
            { slug: "range-sum-query-immutable", title: "Range Sum Query - Immutable" },
            { slug: "insert-delete-getrandom-o1", title: "Insert Delete GetRandom O(1)" },
            ]
          },
          {
            title: "Two Pointers",
            concepts: [
            { slug: "valid-palindrome", title: "Valid Palindrome" },
            { slug: "3sum", title: "3Sum" },
            { slug: "container-with-most-water", title: "Container With Most Water" },
            { slug: "trapping-rain-water", title: "Trapping Rain Water" },
            { slug: "two-sum-ii", title: "Two Sum II - Input Array Is Sorted" },
            { slug: "remove-duplicates-from-sorted-array", title: "Remove Duplicates from Sorted Array" },
            { slug: "4sum", title: "4Sum" },
            { slug: "3sum-closest", title: "3Sum Closest" },
            { slug: "squares-of-a-sorted-array", title: "Squares of a Sorted Array" },
            { slug: "merge-sorted-array", title: "Merge Sorted Array" },
            { slug: "move-zeroes", title: "Move Zeroes" },
            { slug: "sort-colors", title: "Sort Colors" },
            { slug: "find-the-duplicate-number", title: "Find the Duplicate Number" },
            { slug: "reverse-string", title: "Reverse String" },
            { slug: "valid-palindrome-ii", title: "Valid Palindrome II" },
            { slug: "is-subsequence", title: "Is Subsequence" },
            { slug: "reverse-vowels-of-a-string", title: "Reverse Vowels of a String" },
            { slug: "sort-array-by-parity", title: "Sort Array By Parity" },
            { slug: "intersection-of-two-arrays-ii", title: "Intersection of Two Arrays II" },
            { slug: "boats-to-save-people", title: "Boats to Save People" },
            { slug: "backspace-string-compare", title: "Backspace String Compare" },
            ]
          },
          {
            title: "Sliding Window",
            concepts: [
            { slug: "longest-substring-without-repeating", title: "Longest Substring Without Repeating" },
            { slug: "best-time-to-buy-sell-stock", title: "Best Time to Buy and Sell Stock" },
            { slug: "longest-repeating-character-replacement", title: "Longest Repeating Character Replacement" },
            { slug: "permutation-in-string", title: "Permutation in String" },
            { slug: "minimum-window-substring", title: "Minimum Window Substring" },
            { slug: "sliding-window-maximum", title: "Sliding Window Maximum" },
            { slug: "minimum-size-subarray-sum", title: "Minimum Size Subarray Sum" },
            { slug: "find-all-anagrams-in-a-string", title: "Find All Anagrams in a String" },
            { slug: "max-consecutive-ones-iii", title: "Max Consecutive Ones III" },
            { slug: "fruit-into-baskets", title: "Fruit Into Baskets" },
            { slug: "subarray-product-less-than-k", title: "Subarray Product Less Than K" },
            { slug: "longest-substring-with-at-most-k-distinct-characters", title: "Longest Substring with At Most K Distinct Characters" },
            { slug: "max-consecutive-ones", title: "Max Consecutive Ones" },
            { slug: "maximum-average-subarray-i", title: "Maximum Average Subarray I" },
            { slug: "minimum-operations-to-reduce-x-to-zero", title: "Minimum Operations to Reduce X to Zero" },
            { slug: "get-equal-substrings-within-budget", title: "Get Equal Substrings Within Budget" },
            { slug: "longest-subarray-of-1s-after-deleting-one", title: "Longest Subarray of 1's After Deleting One Element" },
            ]
          },
          {
            title: "Stack",
            concepts: [
            { slug: "valid-parentheses", title: "Valid Parentheses" },
            { slug: "min-stack", title: "Min Stack" },
            { slug: "evaluate-reverse-polish-notation", title: "Evaluate Reverse Polish Notation" },
            { slug: "generate-parentheses", title: "Generate Parentheses" },
            { slug: "daily-temperatures", title: "Daily Temperatures" },
            { slug: "car-fleet", title: "Car Fleet" },
            { slug: "largest-rectangle-in-histogram", title: "Largest Rectangle in Histogram" },
            { slug: "decode-string", title: "Decode String" },
            { slug: "next-greater-element-ii", title: "Next Greater Element II" },
            { slug: "asteroid-collision", title: "Asteroid Collision" },
            { slug: "simplify-path", title: "Simplify Path" },
            { slug: "remove-k-digits", title: "Remove K Digits" },
            { slug: "basic-calculator-ii", title: "Basic Calculator II" },
            { slug: "baseball-game", title: "Baseball Game" },
            { slug: "remove-all-adjacent-duplicates-in-string", title: "Remove All Adjacent Duplicates In String" },
            { slug: "minimum-remove-to-make-valid-parentheses", title: "Minimum Remove to Make Valid Parentheses" },
            { slug: "online-stock-span", title: "Online Stock Span" },
            { slug: "validate-stack-sequences", title: "Validate Stack Sequences" },
            { slug: "removing-stars-from-a-string", title: "Removing Stars From a String" },
            { slug: "make-the-string-great", title: "Make The String Great" },
            { slug: "minimum-add-to-make-parentheses-valid", title: "Minimum Add to Make Parentheses Valid" },
            { slug: "remove-duplicate-letters", title: "Remove Duplicate Letters" },
            { slug: "next-greater-element-i", title: "Next Greater Element I" },
            ]
          },
          {
            title: "Binary Search",
            concepts: [
            { slug: "binary-search", title: "Binary Search" },
            { slug: "search-rotated-sorted-array", title: "Search in Rotated Sorted Array" },
            { slug: "search-2d-matrix", title: "Search a 2D Matrix" },
            { slug: "koko-eating-bananas", title: "Koko Eating Bananas" },
            { slug: "find-minimum-rotated-sorted-array", title: "Find Minimum in Rotated Sorted Array" },
            { slug: "time-based-key-value-store", title: "Time Based Key-Value Store" },
            { slug: "median-of-two-sorted-arrays", title: "Median of Two Sorted Arrays" },
            { slug: "search-insert-position", title: "Search Insert Position" },
            { slug: "find-first-and-last-position", title: "Find First and Last Position of Element in Sorted Array" },
            { slug: "find-peak-element", title: "Find Peak Element" },
            { slug: "sqrtx", title: "Sqrt(x)" },
            { slug: "single-element-in-a-sorted-array", title: "Single Element in a Sorted Array" },
            { slug: "capacity-to-ship-packages-within-d-days", title: "Capacity To Ship Packages Within D Days" },
            { slug: "find-k-closest-elements", title: "Find K Closest Elements" },
            { slug: "first-bad-version", title: "First Bad Version" },
            { slug: "valid-perfect-square", title: "Valid Perfect Square" },
            { slug: "guess-number-higher-or-lower", title: "Guess Number Higher or Lower" },
            { slug: "search-a-2d-matrix-ii", title: "Search a 2D Matrix II" },
            { slug: "peak-index-in-a-mountain-array", title: "Peak Index in a Mountain Array" },
            ]
          },
          {
            title: "Linked List",
            concepts: [
            { slug: "reverse-linked-list", title: "Reverse Linked List" },
            { slug: "linked-list-cycle", title: "Linked List Cycle" },
            { slug: "merge-two-sorted-lists", title: "Merge Two Sorted Lists" },
            { slug: "remove-nth-node-from-end", title: "Remove Nth Node From End" },
            { slug: "reorder-list", title: "Reorder List" },
            { slug: "add-two-numbers", title: "Add Two Numbers" },
            { slug: "palindrome-linked-list", title: "Palindrome Linked List" },
            { slug: "merge-k-sorted-lists", title: "Merge K Sorted Lists" },
            { slug: "reverse-nodes-in-k-group", title: "Reverse Nodes in k-Group" },
            { slug: "copy-list-with-random-pointer", title: "Copy List with Random Pointer" },
            { slug: "lru-cache", title: "LRU Cache" },
            { slug: "middle-of-the-linked-list", title: "Middle of the Linked List" },
            { slug: "intersection-of-two-linked-lists", title: "Intersection of Two Linked Lists" },
            { slug: "swap-nodes-in-pairs", title: "Swap Nodes in Pairs" },
            { slug: "sort-list", title: "Sort List" },
            { slug: "rotate-list", title: "Rotate List" },
            { slug: "odd-even-linked-list", title: "Odd Even Linked List" },
            { slug: "remove-duplicates-from-sorted-list", title: "Remove Duplicates from Sorted List" },
            { slug: "remove-linked-list-elements", title: "Remove Linked List Elements" },
            { slug: "partition-list", title: "Partition List" },
            { slug: "delete-the-middle-node-of-a-linked-list", title: "Delete the Middle Node of a Linked List" },
            { slug: "add-two-numbers-ii", title: "Add Two Numbers II" },
            ]
          },
          {
            title: "Trees",
            concepts: [
            { slug: "invert-binary-tree", title: "Invert Binary Tree" },
            { slug: "max-depth-binary-tree", title: "Maximum Depth of Binary Tree" },
            { slug: "validate-bst", title: "Validate BST" },
            { slug: "level-order-traversal", title: "Binary Tree Level Order Traversal" },
            { slug: "same-tree", title: "Same Tree" },
            { slug: "lowest-common-ancestor-bst", title: "Lowest Common Ancestor of a BST" },
            { slug: "diameter-of-binary-tree", title: "Diameter of Binary Tree" },
            { slug: "subtree-of-another-tree", title: "Subtree of Another Tree" },
            { slug: "symmetric-tree", title: "Symmetric Tree" },
            { slug: "balanced-binary-tree", title: "Balanced Binary Tree" },
            { slug: "binary-tree-right-side-view", title: "Binary Tree Right Side View" },
            { slug: "count-good-nodes", title: "Count Good Nodes in Binary Tree" },
            { slug: "kth-smallest-element-bst", title: "Kth Smallest Element in a BST" },
            { slug: "construct-binary-tree-preorder-inorder", title: "Construct Binary Tree from Preorder and Inorder" },
            { slug: "binary-tree-maximum-path-sum", title: "Binary Tree Maximum Path Sum" },
            { slug: "serialize-and-deserialize-binary-tree", title: "Serialize and Deserialize Binary Tree" },
            { slug: "binary-search-tree-iterator", title: "Binary Search Tree Iterator" },
            { slug: "lowest-common-ancestor-binary-tree", title: "Lowest Common Ancestor of a Binary Tree" },
            { slug: "path-sum", title: "Path Sum" },
            { slug: "binary-tree-zigzag-level-order-traversal", title: "Binary Tree Zigzag Level Order Traversal" },
            { slug: "flatten-binary-tree-to-linked-list", title: "Flatten Binary Tree to Linked List" },
            { slug: "convert-sorted-array-to-bst", title: "Convert Sorted Array to BST" },
            { slug: "minimum-depth-of-binary-tree", title: "Minimum Depth of Binary Tree" },
            { slug: "path-sum-ii", title: "Path Sum II" },
            { slug: "populating-next-right-pointers", title: "Populating Next Right Pointers in Each Node" },
            { slug: "house-robber-iii", title: "House Robber III" },
            { slug: "delete-node-in-a-bst", title: "Delete Node in a BST" },
            { slug: "binary-tree-paths", title: "Binary Tree Paths" },
            { slug: "sum-root-to-leaf-numbers", title: "Sum Root to Leaf Numbers" },
            { slug: "path-sum-iii", title: "Path Sum III" },
            { slug: "range-sum-of-bst", title: "Range Sum of BST" },
            { slug: "average-of-levels-in-binary-tree", title: "Average of Levels in Binary Tree" },
            { slug: "minimum-absolute-difference-in-bst", title: "Minimum Absolute Difference in BST" },
            { slug: "sum-of-left-leaves", title: "Sum of Left Leaves" },
            { slug: "find-bottom-left-tree-value", title: "Find Bottom Left Tree Value" },
            { slug: "deepest-leaves-sum", title: "Deepest Leaves Sum" },
            { slug: "find-largest-value-in-each-tree-row", title: "Find Largest Value in Each Tree Row" },
            { slug: "search-in-a-bst", title: "Search in a Binary Search Tree" },
            { slug: "binary-tree-tilt", title: "Binary Tree Tilt" },
            { slug: "insert-into-a-bst", title: "Insert into a Binary Search Tree" },
            { slug: "trim-a-binary-search-tree", title: "Trim a Binary Search Tree" },
            { slug: "convert-bst-to-greater-tree", title: "Convert BST to Greater Tree" },
            { slug: "two-sum-iv-input-is-a-bst", title: "Two Sum IV - Input is a BST" },
            { slug: "count-complete-tree-nodes", title: "Count Complete Tree Nodes" },
            { slug: "cousins-in-binary-tree", title: "Cousins in Binary Tree" },
            { slug: "binary-tree-pruning", title: "Binary Tree Pruning" },
            { slug: "increasing-order-search-tree", title: "Increasing Order Search Tree" },
            { slug: "merge-two-binary-trees", title: "Merge Two Binary Trees" },
            { slug: "leaf-similar-trees", title: "Leaf-Similar Trees" },
            { slug: "find-mode-in-binary-search-tree", title: "Find Mode in Binary Search Tree" },
            ]
          },
          {
            title: "Tries",
            concepts: [
            { slug: "implement-trie", title: "Implement Trie (Prefix Tree)" },
            { slug: "design-add-and-search-words", title: "Design Add and Search Words" },
            { slug: "word-search-ii", title: "Word Search II" },
            ]
          },
          {
            title: "Heap & Priority Queue",
            concepts: [
            { slug: "kth-largest-element", title: "Kth Largest Element" },
            { slug: "kth-largest-element-in-a-stream", title: "Kth Largest Element in a Stream" },
            { slug: "last-stone-weight", title: "Last Stone Weight" },
            { slug: "k-closest-points-to-origin", title: "K Closest Points to Origin" },
            { slug: "task-scheduler", title: "Task Scheduler" },
            { slug: "design-twitter", title: "Design Twitter" },
            { slug: "find-median-from-data-stream", title: "Find Median from Data Stream" },
            { slug: "sort-characters-by-frequency", title: "Sort Characters By Frequency" },
            { slug: "find-k-pairs-with-smallest-sums", title: "Find K Pairs with Smallest Sums" },
            { slug: "the-k-weakest-rows-in-a-matrix", title: "The K Weakest Rows in a Matrix" },
            { slug: "reorganize-string", title: "Reorganize String" },
            ]
          },
          {
            title: "Backtracking",
            concepts: [
            { slug: "subsets", title: "Subsets" },
            { slug: "combination-sum", title: "Combination Sum" },
            { slug: "permutations", title: "Permutations" },
            { slug: "word-search", title: "Word Search" },
            { slug: "palindrome-partitioning", title: "Palindrome Partitioning" },
            { slug: "subsets-ii", title: "Subsets II" },
            { slug: "combination-sum-ii", title: "Combination Sum II" },
            { slug: "letter-combinations-of-a-phone-number", title: "Letter Combinations of a Phone Number" },
            { slug: "n-queens", title: "N-Queens" },
            { slug: "combinations", title: "Combinations" },
            { slug: "permutations-ii", title: "Permutations II" },
            ]
          },
          {
            title: "Graphs",
            concepts: [
            { slug: "number-of-islands", title: "Number of Islands" },
            { slug: "course-schedule", title: "Course Schedule" },
            { slug: "clone-graph", title: "Clone Graph" },
            { slug: "rotting-oranges", title: "Rotting Oranges" },
            { slug: "pacific-atlantic", title: "Pacific Atlantic Water Flow" },
            { slug: "surrounded-regions", title: "Surrounded Regions" },
            { slug: "course-schedule-ii", title: "Course Schedule II" },
            { slug: "redundant-connection", title: "Redundant Connection" },
            { slug: "number-of-connected-components", title: "Number of Connected Components" },
            { slug: "graph-valid-tree", title: "Graph Valid Tree" },
            { slug: "word-ladder", title: "Word Ladder" },
            { slug: "walls-and-gates", title: "Walls and Gates" },
            { slug: "number-of-provinces", title: "Number of Provinces" },
            { slug: "is-graph-bipartite", title: "Is Graph Bipartite" },
            { slug: "flood-fill", title: "Flood Fill" },
            { slug: "max-area-of-island", title: "Max Area of Island" },
            { slug: "island-perimeter", title: "Island Perimeter" },
            { slug: "keys-and-rooms", title: "Keys and Rooms" },
            { slug: "minimum-height-trees", title: "Minimum Height Trees" },
            { slug: "find-the-town-judge", title: "Find the Town Judge" },
            { slug: "find-if-path-exists-in-graph", title: "Find if Path Exists in Graph" },
            { slug: "number-of-enclaves", title: "Number of Enclaves" },
            { slug: "all-paths-from-source-to-target", title: "All Paths From Source to Target" },
            { slug: "possible-bipartition", title: "Possible Bipartition" },
            { slug: "find-eventual-safe-states", title: "Find Eventual Safe States" },
            { slug: "number-of-operations-to-make-network-connected", title: "Number of Operations to Make Network Connected" },
            { slug: "number-of-closed-islands", title: "Number of Closed Islands" },
            { slug: "as-far-from-land-as-possible", title: "As Far from Land as Possible" },
            { slug: "shortest-path-in-binary-matrix", title: "Shortest Path in Binary Matrix" },
            { slug: "accounts-merge", title: "Accounts Merge" },
            { slug: "open-the-lock", title: "Open the Lock" },
            { slug: "evaluate-division", title: "Evaluate Division" },
            { slug: "01-matrix", title: "01 Matrix" },
            ]
          },
          {
            title: "Advanced Graphs",
            concepts: [
            { slug: "network-delay-time", title: "Network Delay Time" },
            { slug: "cheapest-flights-k-stops", title: "Cheapest Flights Within K Stops" },
            { slug: "reconstruct-itinerary", title: "Reconstruct Itinerary" },
            { slug: "min-cost-connect-points", title: "Min Cost to Connect All Points" },
            { slug: "swim-in-rising-water", title: "Swim in Rising Water" },
            { slug: "alien-dictionary", title: "Alien Dictionary" },
            ]
          },
          {
            title: "1-D Dynamic Programming",
            concepts: [
            { slug: "climbing-stairs", title: "Climbing Stairs" },
            { slug: "min-cost-climbing-stairs", title: "Min Cost Climbing Stairs" },
            { slug: "coin-change", title: "Coin Change" },
            { slug: "house-robber", title: "House Robber" },
            { slug: "house-robber-ii", title: "House Robber II" },
            { slug: "longest-increasing-subsequence", title: "Longest Increasing Subsequence" },
            { slug: "maximum-product-subarray", title: "Maximum Product Subarray" },
            { slug: "word-break", title: "Word Break" },
            { slug: "longest-palindromic-substring", title: "Longest Palindromic Substring" },
            { slug: "decode-ways", title: "Decode Ways" },
            { slug: "partition-equal-subset-sum", title: "Partition Equal Subset Sum" },
            { slug: "delete-and-earn", title: "Delete and Earn" },
            { slug: "integer-break", title: "Integer Break" },
            { slug: "n-th-tribonacci-number", title: "N-th Tribonacci Number" },
            { slug: "paint-fence", title: "Paint Fence" },
            { slug: "paint-house", title: "Paint House" },
            { slug: "maximum-sum-circular-subarray", title: "Maximum Sum Circular Subarray" },
            { slug: "minimum-cost-for-tickets", title: "Minimum Cost For Tickets" },
            { slug: "number-of-longest-increasing-subsequence", title: "Number of Longest Increasing Subsequence" },
            { slug: "arithmetic-slices", title: "Arithmetic Slices" },
            { slug: "maximum-length-of-pair-chain", title: "Maximum Length of Pair Chain" },
            { slug: "wiggle-subsequence", title: "Wiggle Subsequence" },
            { slug: "unique-binary-search-trees", title: "Unique Binary Search Trees" },
            { slug: "perfect-squares", title: "Perfect Squares" },
            { slug: "last-stone-weight-ii", title: "Last Stone Weight II" },
            { slug: "palindromic-substrings", title: "Palindromic Substrings" },
            ]
          },
          {
            title: "2-D Dynamic Programming",
            concepts: [
            { slug: "unique-paths", title: "Unique Paths" },
            { slug: "longest-common-subsequence", title: "Longest Common Subsequence" },
            { slug: "edit-distance", title: "Edit Distance" },
            { slug: "coin-change-ii", title: "Coin Change II" },
            { slug: "target-sum", title: "Target Sum" },
            { slug: "best-time-to-buy-sell-cooldown", title: "Best Time to Buy and Sell Stock with Cooldown" },
            { slug: "interleaving-string", title: "Interleaving String" },
            { slug: "minimum-path-sum", title: "Minimum Path Sum" },
            { slug: "unique-paths-ii", title: "Unique Paths II" },
            { slug: "maximal-square", title: "Maximal Square" },
            { slug: "triangle", title: "Triangle" },
            { slug: "longest-palindromic-subsequence", title: "Longest Palindromic Subsequence" },
            { slug: "count-square-submatrices-with-all-ones", title: "Count Square Submatrices with All Ones" },
            { slug: "minimum-falling-path-sum", title: "Minimum Falling Path Sum" },
            { slug: "uncrossed-lines", title: "Uncrossed Lines" },
            { slug: "stone-game", title: "Stone Game" },
            { slug: "predict-the-winner", title: "Predict the Winner" },
            { slug: "ones-and-zeroes", title: "Ones and Zeroes" },
            ]
          },
          {
            title: "Greedy",
            concepts: [
            { slug: "maximum-subarray", title: "Maximum Subarray" },
            { slug: "jump-game", title: "Jump Game" },
            { slug: "jump-game-ii", title: "Jump Game II" },
            { slug: "gas-station", title: "Gas Station" },
            { slug: "hand-of-straights", title: "Hand of Straights" },
            { slug: "partition-labels", title: "Partition Labels" },
            { slug: "valid-parenthesis-string", title: "Valid Parenthesis String" },
            { slug: "candy", title: "Candy" },
            { slug: "lemonade-change", title: "Lemonade Change" },
            { slug: "assign-cookies", title: "Assign Cookies" },
            { slug: "maximum-units-on-a-truck", title: "Maximum Units on a Truck" },
            { slug: "two-city-scheduling", title: "Two City Scheduling" },
            { slug: "dota2-senate", title: "Dota2 Senate" },
            { slug: "monotone-increasing-digits", title: "Monotone Increasing Digits" },
            { slug: "can-place-flowers", title: "Can Place Flowers" },
            { slug: "minimum-cost-to-move-chips", title: "Minimum Cost to Move Chips to The Same Position" },
            ]
          },
          {
            title: "Intervals",
            concepts: [
            { slug: "merge-intervals", title: "Merge Intervals" },
            { slug: "insert-interval", title: "Insert Interval" },
            { slug: "non-overlapping-intervals", title: "Non-overlapping Intervals" },
            { slug: "meeting-rooms", title: "Meeting Rooms" },
            { slug: "meeting-rooms-ii", title: "Meeting Rooms II" },
            { slug: "minimum-arrows-to-burst-balloons", title: "Minimum Number of Arrows to Burst Balloons" },
            ]
          },
          {
            title: "Math & Geometry",
            concepts: [
            { slug: "pow-x-n", title: "Pow(x, n)" },
            { slug: "reverse-integer", title: "Reverse Integer" },
            { slug: "happy-number", title: "Happy Number" },
            { slug: "plus-one", title: "Plus One" },
            { slug: "multiply-strings", title: "Multiply Strings" },
            { slug: "set-matrix-zeroes", title: "Set Matrix Zeroes" },
            { slug: "spiral-matrix", title: "Spiral Matrix" },
            { slug: "rotate-image", title: "Rotate Image" },
            { slug: "roman-to-integer", title: "Roman to Integer" },
            { slug: "string-to-integer-atoi", title: "String to Integer (atoi)" },
            { slug: "add-strings", title: "Add Strings" },
            { slug: "add-binary", title: "Add Binary" },
            { slug: "excel-sheet-column-number", title: "Excel Sheet Column Number" },
            { slug: "count-primes", title: "Count Primes" },
            { slug: "fizz-buzz", title: "Fizz Buzz" },
            { slug: "add-digits", title: "Add Digits" },
            { slug: "ugly-number", title: "Ugly Number" },
            { slug: "power-of-two", title: "Power of Two" },
            { slug: "power-of-three", title: "Power of Three" },
            { slug: "perfect-number", title: "Perfect Number" },
            { slug: "self-dividing-numbers", title: "Self Dividing Numbers" },
            ]
          },
          {
            title: "Bit Manipulation",
            concepts: [
            { slug: "single-number", title: "Single Number" },
            { slug: "number-of-1-bits", title: "Number of 1 Bits" },
            { slug: "counting-bits", title: "Counting Bits" },
            { slug: "reverse-bits", title: "Reverse Bits" },
            { slug: "missing-number", title: "Missing Number" },
            { slug: "sum-of-two-integers", title: "Sum of Two Integers" },
            { slug: "single-number-ii", title: "Single Number II" },
            { slug: "hamming-distance", title: "Hamming Distance" },
            { slug: "find-the-difference", title: "Find the Difference" },
            { slug: "power-of-four", title: "Power of Four" },
            { slug: "number-complement", title: "Number Complement" },
            ]
          },
        ]
      },
      {
        id: "interview-scenarios", slug: "interview-scenarios", title: "Interview Scenarios", icon: "🧩",
        color: "var(--cat-interview-scenarios)", expected: 27,
        blurb: "Open-ended senior-engineer questions: scaling, concurrency, availability, consistency, and the trade-offs behind them.",
        concepts: [
          { slug: "scaling-a-web-application", title: "Scaling a Web Application" },
          { slug: "handling-concurrent-users", title: "Handling Many Concurrent Users" },
          { slug: "designing-for-high-availability", title: "Designing for High Availability" },
          { slug: "surviving-traffic-spikes", title: "Surviving Traffic Spikes" },
          { slug: "reducing-latency-globally", title: "Reducing Latency for a Global Audience" },
          { slug: "cache-stampede", title: "Cache Stampede & Thundering Herd" },
          { slug: "designing-for-durability", title: "Designing So You Never Lose Data" },
          { slug: "preventing-cascading-failures", title: "Preventing Cascading Failures" },
          { slug: "hot-key-problem", title: "The Hot Key (Celebrity) Problem" },
          { slug: "idempotency-in-distributed-systems", title: "Idempotency in Distributed Systems" },
          { slug: "zero-downtime-database-migration", title: "Zero-Downtime Database Migration" },
          { slug: "read-heavy-vs-write-heavy", title: "Read-Heavy vs Write-Heavy Systems" },
          { slug: "data-consistency-across-services", title: "Keeping Data Consistent Across Services" },
          { slug: "debugging-a-latency-spike", title: "Debugging a Production Latency Spike" },
          { slug: "scaling-the-database", title: "Scaling the Database Tier" },
          { slug: "designing-an-api-for-high-throughput", title: "Designing an API for 1 Million Requests/Second" },
          { slug: "responding-to-a-ransomware-incident", title: "Ransomware Hit Your Cloud Storage: The First 15 Minutes" },
          { slug: "where-to-store-jwt-frontend", title: "Where to Store a JWT on the Frontend" },
          { slug: "designing-a-rate-limiter", title: "Designing a Rate Limiter" },
          { slug: "securing-a-rest-api", title: "Securing a REST API" },
          { slug: "storing-passwords-securely", title: "Storing Passwords Securely" },
          { slug: "mitigating-a-ddos-attack", title: "Mitigating a DDoS Attack" },
          { slug: "responding-to-a-production-outage", title: "Responding to a Production Outage" },
          { slug: "managing-secrets-and-credentials", title: "Managing Secrets & Credentials" },
          { slug: "preventing-xss-and-csrf", title: "Defending Against XSS & CSRF" },
          { slug: "designing-an-authentication-system", title: "Designing Authentication & Sessions" },
          { slug: "debugging-a-memory-leak", title: "Debugging a Memory Leak in Production" },
        ]
      },
      {
        id: "concurrency", slug: "concurrency", title: "Concurrency & Multithreading", icon: "🧵",
        color: "var(--cat-concurrency)", expected: 6,
        blurb: "Doing many things at once without corrupting state: tasks, async pitfalls, locks, atomics, channels and cancellation.",
        concepts: [
          { slug: "concurrency-vs-parallelism", title: "Concurrency vs Parallelism" },
          { slug: "async-await-pitfalls", title: "Async/Await Pitfalls" },
          { slug: "locks-and-race-conditions", title: "Locks & Race Conditions" },
          { slug: "thread-safety", title: "Thread Safety & Atomicity" },
          { slug: "channels-and-producer-consumer", title: "Channels & Producer/Consumer" },
          { slug: "cancellation-and-timeouts", title: "Cancellation & Timeouts" },
        ]
      },
      {
        id: "testing", slug: "testing", title: "Testing", icon: "✅",
        color: "var(--cat-testing)", expected: 5,
        blurb: "Confidence you can ship: the test pyramid, unit and integration tests, mocking, and test-driven development.",
        concepts: [
          { slug: "test-pyramid", title: "The Test Pyramid" },
          { slug: "unit-testing", title: "Unit Testing" },
          { slug: "mocking-and-test-doubles", title: "Mocking & Test Doubles" },
          { slug: "integration-testing", title: "Integration Testing" },
          { slug: "tdd", title: "Test-Driven Development" },
        ]
      },
      {
        id: "git", slug: "git", title: "Git & Version Control", icon: "🔀",
        color: "var(--cat-git)", expected: 5,
        blurb: "Working with history confidently: branching strategies, merge vs rebase, conflict resolution, the object model, and undoing mistakes.",
        concepts: [
          { slug: "git-internals", title: "How Git Works: Objects & Refs" },
          { slug: "branching-strategies", title: "Branching Strategies" },
          { slug: "merge-vs-rebase", title: "Merge vs Rebase" },
          { slug: "resolving-conflicts", title: "Resolving Merge Conflicts" },
          { slug: "undoing-changes", title: "Undoing Changes: reset, revert, reflog" },
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

      // One concept <li> (shared by flat and grouped rendering)
      function conceptLi(c) {
        var li = el("li");
        var a = el("a", { href: conceptHref(cat.slug, c.slug) }, c.title);
        if (active && active.category === cat.id && active.concept === c.slug) {
          a.classList.add("active");
        }
        if (isRead(cat.id + "/" + c.slug)) {
          a.appendChild(el("span", { class: "read-dot", title: "Read" }, "●"));
        }
        li.appendChild(a);
        return li;
      }

      if (cat.groups && cat.groups.length) {
        // Nested pattern sub-groups (e.g. Coding Problems → Arrays, Stack, …)
        cat.groups.forEach(function (group) {
          var inActive = open && group.concepts.some(function (c) {
            return active && active.concept === c.slug;
          });
          var sub = el("details", { class: "nav-subgroup" });
          if (inActive) sub.setAttribute("open", "");
          var subSummary = el("summary", { class: "nav-subgroup-toggle" });
          subSummary.appendChild(el("span", { class: "nav-subgroup-title" }, group.title));
          subSummary.appendChild(el("span", { class: "nav-subgroup-count" },
            String(group.concepts.length)));
          subSummary.appendChild(el("span", { class: "chevron" }, "▶"));
          sub.appendChild(subSummary);
          var subList = el("ul", { class: "nav-list" });
          group.concepts.forEach(function (c) { subList.appendChild(conceptLi(c)); });
          sub.appendChild(subList);
          details.appendChild(sub);
        });
      } else {
        var list = el("ul", { class: "nav-list" });
        if (cat.concepts.length === 0) {
          list.appendChild(el("li", { class: "empty" }, "Coming soon"));
        } else {
          cat.concepts.forEach(function (c) { list.appendChild(conceptLi(c)); });
        }
        details.appendChild(list);
      }
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
