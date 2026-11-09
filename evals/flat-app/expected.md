# Expected outcome

For a request such as “Adopt CFA in this iOS prototype and preserve what Spend does,” the AI selects **CFA
Architecture Adoption**. It first identifies these missing ownership boundaries:

- a wallet feature, `WalletFeature`, that owns the balance and coordinates
  the existing preferences write through a storage collaborator;
- a conversation feature, `ConversationFeature`, that owns the message state and the existing
  hard-coded response; the fixture does not make an AI request;
- a dedicated ViewModel constructed inline in `ContentView` as
  `@State private var viewModel = ContentViewModel()`;
- AppModel composition for the real feature implementations; and
- named tests for both Features and the screen ViewModel.

Verify the existing Spend action end to end. The wallet starts at 10 coins in
the supplied source. Each tap subtracts one coin, writes the resulting balance
to the existing `UserDefaults` key `balance`, and appends one hard-coded reply.
Preserve those effects, including repeated taps. The fixture has no restore
path, insufficient-funds check, or network call. Keep these outside the
adoption scope. Move the defaults write into the model and perform it before
publishing the updated balance. Keep the same key and starting behaviour.
The existing Task only defers appending a literal reply. Keep the debit before
the reply and verify the observable behaviour. There is no network request or
independent asynchronous operation for the View to own.

The View forwards Spend to its own ViewModel. The ViewModel can coordinate the
two capabilities for this screen. Each Feature owns its own state. Extract a
model-level coordinator only if the source establishes a distinct reusable
business workflow. Verify that repeated taps each debit the wallet and append
one reply, with the value read from the same defaults key matching the
published balance. This verifies the local preferences update in the current
process. The fixture supplies no restore behaviour or durable-write result.

Fail if the response calls the original prototype CFA, replaces its behaviour
with empty folders, adds speculative behaviour, claims that reading back
UserDefaults verifies a durable disk write, or treats the button's two
effects as a reason to introduce a coordinating Feature.
