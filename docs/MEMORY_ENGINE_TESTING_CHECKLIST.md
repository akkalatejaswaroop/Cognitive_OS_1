# Cognitive Memory Engine - QA Testing Checklist

This document provides a comprehensive test suite to validate the reliability, performance, and security of the Cognitive Memory Engine.

## Testing Overview
| ID | Area | Objective | Priority |
|:---|:---|:---|:---|
| **1.0** | **Memory Save Testing** | Validate end-to-end storage flow from API to ChromaDB/Postgres. | P0 |
| **2.0** | **Retrieval Testing** | Ensure stored memories can be successfully searched and retrieved. | P0 |
| **3.0** | **Semantic Similarity** | Verify that search returns semantically relevant results, not just keyword matches. | P1 |
| **4.0** | **Vector DB Testing** | Validate ChromaDB collection integrity, persistence, and indexing. | P1 |
| **5.0** | **API Failure Testing** | Ensure graceful handling of OpenAI/ChromaDB downtime. | P0 |
| **6.0** | **Performance Testing** | Measure latency for embedding generation and vector search. | P2 |
| **7.0** | **Large Memory Testing** | Validate system behavior with 10,000+ memory entries per user. | P2 |
| **8.0** | **Cross-User Isolation** | Critical security check: Ensure User A never retrieves User B's memories. | P0 |
| **9.0** | **Recall Accuracy** | Evaluate the effectiveness of the ranking algorithm (Similarity + Recency + Importance). | P1 |
| **10.0** | **Token Usage** | Verify context assembler correctly respects and optimizes token limits. | P1 |

---

## Detailed Test Cases

### 1. Memory Save Testing
| Case ID | Test Description | Expected Result |
|:---|:---|:---|
| 1.1 | Save simple text memory | Returns 201 Created with UUID; record exists in ChromaDB and Postgres. |
| 1.2 | Save memory with complex metadata | Metadata is correctly serialized and retrievable via ChromaDB `where` filters. |
| 1.3 | Save empty or null content | API returns 400 Bad Request; no record created. |
| 1.4 | Save very long text (> 10k chars) | Text is correctly cleaned/truncated and embedded without failure. |

### 2. Retrieval Testing
| Case ID | Test Description | Expected Result |
|:---|:---|:---|
| 2.1 | Basic semantic search | Results sorted by similarity; content matches the intent of the query. |
| 2.2 | Search with no results | Returns empty array `[]` with success status (not an error). |
| 2.3 | Retrieval with `nResults` limit | API returns exactly the requested number of items or fewer if not available. |

### 3. Semantic Similarity
| Case ID | Test Description | Expected Result |
|:---|:---|:---|
| 3.1 | Concept-based retrieval | Searching for "fruit" returns a memory about "apples" even if "fruit" is not in text. |
| 3.2 | Synonym handling | Searching for "automobile" returns memories mentioning "car". |

### 4. Vector DB Testing
| Case ID | Test Description | Expected Result |
|:---|:---|:---|
| 4.1 | Collection persistence | Memories survive a restart of the ChromaDB service/container. |
| 4.2 | Indexing speed | New memories are available for search within < 500ms of successful save. |

### 5. API Failure Testing
| Case ID | Test Description | Expected Result |
|:---|:---|:---|
| 5.1 | OpenAI API Timeout | Pipeline executes retries (configured count) then returns meaningful error. |
| 5.2 | ChromaDB Service Down | API returns 500 error; system logs indicate DB connection failure. |
| 5.3 | Invalid OpenAI Key | API logs "Authentication Error" and returns clean error to frontend. |

### 6. Performance Testing
| Case ID | Test Description | Expected Result |
|:---|:---|:---|
| 6.1 | Search Latency | Median search time < 300ms (excluding OpenAI embedding call). |
| 6.2 | Save Latency | Median save time < 800ms (including OpenAI embedding call). |

### 7. Large Memory Testing
| Case ID | Test Description | Expected Result |
|:---|:---|:---|
| 7.1 | Search with 10k entries | Search latency remains stable; no significant performance degradation. |

### 8. Cross-User Isolation (Security)
| Case ID | Test Description | Expected Result |
|:---|:---|:---|
| 8.1 | User B query for User A data | Searching with User B's ID returns 0 results for data owned by User A. |
| 8.2 | Metadata leakage check | Metadata fields like `userId` are never leaked in plain text to other users. |

### 9. Recall Accuracy (Context Ranking)
| Case ID | Test Description | Expected Result |
|:---|:---|:---|
| 9.1 | Recency Bias Test | Two similar memories exist; the more recent one should have a higher composite score. |
| 9.2 | Importance Bias Test | A high-importance memory (1.0) ranks higher than a low-importance one (0.1) for same query. |

### 10. Token Usage Testing
| Case ID | Test Description | Expected Result |
|:---|:---|:---|
| 10.1 | Hard Token Limit | Assembler output never exceeds `maxTokens` (± 5% estimation error). |
| 10.2 | Compression Effectiveness | Lower scoring items are compressed/truncated as expected to fit budget. |
