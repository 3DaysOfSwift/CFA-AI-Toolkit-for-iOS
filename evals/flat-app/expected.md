# Expected outcome

For a request such as “Tidy this iOS project using CFA,” the AI selects **CFA
Architecture Adoption**. It first identifies these missing ownership boundaries:

- a wallet feature that owns the balance and its existing persistence write;
- a conversation feature that owns the message state and the existing
  hard-coded response; the fixture does not make an AI request;
- a dedicated ViewModel constructed by `ContentView` in its private `@State
  viewModel` property;
- AppModel composition for the real feature implementations; and
- focused tests for wallet and conversation behaviour.

Verify the existing Spend action end to end. The wallet starts at 10 coins in
the supplied source. Each tap subtracts one coin, writes the resulting balance
to the existing `UserDefaults` key `balance`, and appends one hard-coded reply.
Preserve those effects, including repeated taps. The fixture has no restore
path, insufficient-funds check, or network call. Keep these outside the
adoption scope. Move the defaults write into the model and perform it before
publishing the updated balance.

It does not call this a CFA application, add empty numbered folders, or move
unrelated behaviour while claiming the architecture has been adopted.
