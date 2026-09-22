# Node labels in Event History

Each node activity is scheduled with the node's authored label as its Temporal Summary, so Event History lists the names from your diagram instead of a column of identical `executeNode` rows. A node without a label simply gets no summary, where Temporal falls back to showing the activity type.

The label is normalised on the way in: runs of whitespace collapse to single spaces, because Temporal renders the Summary as single-line markdown. It is then clamped to 300 UTF-8 bytes, since the Summary is copied into every `ActivityTaskScheduled` event and an unbounded one grows Event History for the whole life of the run. The clamp counts bytes and cuts on code-point boundaries, so a label in a non-Latin script gets a shorter summary than an ASCII one of the same length, and an emoji is never cut in half.

The budget applies to the **raw string**, which is not the same thing the server's 400-byte `limit.userMetadataSummarySize` measures. That cap counts the serialized payload, so JSON escaping is inside it: a quote or a backslash costs two bytes, and a control character six. A custom payload converter or codec shifts it again, and an encrypting one grows it. So no byte figure here is a promise about what the server will accept, and clamping by serialized size is deliberately out of scope (follow-up: temporal-profile-wire-validation). The cap is unenforced today; the reason to keep summaries short is Event History, not the cap.

Filling in `node.label` belongs to whatever builds the `WorkflowExecutionInput`, not to this package. If your own layer never sets it you get the identical `executeNode` rows back, and nothing here can tell the difference.
