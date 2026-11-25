# The AI chat streams, and asks before it writes (#18)

Signed in with the local admin login. Step 2 saves one `zz-test-` entry only if you approve it.

1. **A reply streams:** on `/admin/ai-assistant`, ask "What can you help me with?". You should see the reply arrive bit by bit, not all at once after a wait.
2. **A write asks first:** ask it to "add an expense of 100 for zz-test-lunch today". You should see an approval card describing the entry, and nothing in the Ledger yet.
3. **Reject it:** reject the card. `/admin/money/entries` should show no `zz-test-lunch` entry.

- **Must not happen:** an entry saved before you approve; an error banner in place of the reply.
- **Records:** none, if you reject the card. If you approve it, delete the `zz-test-lunch` entry from the Ledger.
