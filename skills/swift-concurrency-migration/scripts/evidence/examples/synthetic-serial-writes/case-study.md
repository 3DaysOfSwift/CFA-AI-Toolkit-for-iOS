# SYNTHETIC: ordered writes

This is a fictional reasoning exercise, not a migration result. It contains no
third-party code and no executed verification. The hypothetical app accepts
ordered saves. Replacing its pipeline with independent tasks would need evidence
that the same ordering survives; simply using an actor would not settle what
happens across suspension points.

The proposed CFA choice is feature-owned sequencing, with storage behind a
dependency. The general concurrency observation and the CFA ownership preference
are separately labelled in record.json. Neither is an instruction to introduce
queues into every app: a real project may require coalescing, independent work
or latest-request-wins instead.

A real experiment would hold the first write at a controlled suspension, submit
the next write and assert acceptance order, individual result delivery, failure
handling and the existing cancellation policy. Those tests were not performed.

There was no human correction. The alternative in the record is part of this
authored exercise, not a claimed event from a real project.
