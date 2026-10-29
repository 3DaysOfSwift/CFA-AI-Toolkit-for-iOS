import SwiftUI

struct PracticeView: View {
    @State private var viewModel = PracticeViewModel()
    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                StreakStrip(streak: viewModel.streak, days: viewModel.week)
                ScrollView {
                    VStack(spacing: 22) {
                        if let error = viewModel.errorMessage {
                            OperationErrorView(message: error, retry: viewModel.retry)
                        }
                        if let session = viewModel.session {
                            if session.isComplete { completion(session) }
                            else { question(session) }
                        } else if viewModel.hasLoaded {
                            introduction
                        } else if viewModel.errorMessage == nil {
                            ProgressView("Fetching your practice…").padding(40)
                        }
                    }
                    .padding(20)
                    .frame(maxWidth: 650)
                    .frame(maxWidth: .infinity)
                }
            }
            .background(themeManager.current.background)
            .navigationTitle("Todays Twenty")
            .navigationBarTitleDisplayMode(.inline)
            .task { await viewModel.refresh().value }
            .task(id: scenePhase == .active ? viewModel.questionAwaitingAdvanceID : nil) {
                guard scenePhase == .active else { return }
                await viewModel.advanceAfterFeedback()
            }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active { viewModel.refresh() }
            }
            .background {
                // A foreground midnight must unlock the new day without restarting the app.
                DayBoundaryObserver { viewModel.refresh() }
            }
        }
        .toolbar(viewModel.isSessionInProgress ? .hidden : .visible, for: .tabBar)
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.25), value: viewModel.isSessionInProgress)
    }

    private var introduction: some View {
        VStack(spacing: 24) {
            HeroCard {
                VStack(spacing: 16) {
                    Text("A LITTLE EVERY DAY").font(.caption.weight(.bold)).tracking(2).opacity(0.7)
                    Text("\(PracticeSession.target)").font(.system(size: 100, weight: .bold, design: .rounded))
                    Text("Small questions.\nA sharper you.").font(.title.bold()).multilineTextAlignment(.center)
                    Text("Twenty correct answers. One daily habit.").font(.subheadline).opacity(0.8)
                }
            }
            VStack(alignment: .leading, spacing: 16) {
                Label("Answer in your head. No timer, no pressure.", systemImage: "brain.head.profile")
                Label("A correct first try earns one point.", systemImage: "checkmark.circle")
                Label("Tap a question to reveal it, without a point.", systemImage: "hand.tap")
            }.font(.subheadline).frame(maxWidth: .infinity, alignment: .leading)
            PrimaryAction(title: "Start today's twenty", symbol: "arrow.right") {
                viewModel.perform(.start(extra: false, difficulty: viewModel.preferredDifficulty))
            }
            Text("One daily session, plus one optional extra practice.\nYour place is saved after every answer.")
                .font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
        }
    }

    private func question(_ session: PracticeSession) -> some View {
        VStack(spacing: 22) {
            HStack {
                Label(session.isExtraPractice ? "Extra practice" : "Daily practice", systemImage: "sparkles")
                Spacer()
                Text("\(session.correctCount) / \(PracticeSession.target)").monospacedDigit().bold()
            }.font(.subheadline).foregroundStyle(.secondary)
            ProgressView(value: Double(session.correctCount), total: Double(PracticeSession.target))
                .accessibilityLabel("\(session.correctCount) of \(PracticeSession.target) correct answers")
            Button {
                viewModel.perform(.reveal(questionID: session.question.id))
            } label: {
                HeroCard {
                    VStack(spacing: 18) {
                        Text("QUESTION \(session.questionNumber)").font(.caption.weight(.bold)).tracking(2).opacity(0.7)
                        Text("\(session.question.left) × \(session.question.right)")
                            .font(.system(size: 68, weight: .bold, design: .rounded))
                            .minimumScaleFactor(0.5).lineLimit(1)
                        Label(session.question.isRevealed ? "Answer revealed" : "Tap to reveal",
                              systemImage: session.question.isRevealed ? "eye.fill" : "hand.tap")
                            .font(.footnote).opacity(0.75)
                    }
                }
            }
            .buttonStyle(PracticeButtonStyle())
            .disabled(session.question.isResolved)
            .accessibilityLabel("\(session.question.left) times \(session.question.right)")
            .accessibilityHint("Double tap to reveal the answer. Revealed answers earn no point.")

            if session.canChangeDifficulty {
                Picker("Difficulty", selection: Binding(get: { session.difficulty }, set: { viewModel.perform(.difficulty($0)) })) {
                    ForEach(Difficulty.allCases) { Text($0.detail).tag($0) }
                }
                .pickerStyle(.menu).frame(minHeight: 48)
                Text("Choose now. Difficulty locks at question two.").font(.caption).foregroundStyle(.secondary)
            }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: dynamicTypeSize.isAccessibilitySize ? 2 : 3), spacing: 14) {
                ForEach(Array(session.question.choices.enumerated()), id: \.element) { index, answer in
                    answerButton(answer, index: index, question: session.question)
                }
            }
            Text(viewModel.feedback).font(.subheadline).multilineTextAlignment(.center)
                .foregroundStyle(.secondary).frame(minHeight: 42)
        }
    }

    private func answerButton(_ answer: Int, index: Int, question: MultiplicationQuestion) -> some View {
        let isCorrect = question.isResolved && answer == question.answer
        let isWrong = question.wrongAnswers.contains(answer)
        let background = isCorrect ? themeManager.current.success : isWrong ? themeManager.current.error : themeManager.current.surface
        return Button {
            viewModel.perform(.answer(questionID: question.id, value: answer))
        } label: {
            HStack(spacing: 4) {
                Text(answer.formatted()).font(.title2.bold().monospacedDigit())
                if isCorrect || isWrong {
                    Image(systemName: isCorrect ? "checkmark" : "xmark").font(.caption.bold())
                }
            }
            .minimumScaleFactor(0.6).lineLimit(1)
            .frame(maxWidth: .infinity, minHeight: 76)
            .foregroundStyle(isCorrect || isWrong ? Color.white : Color.primary)
            .background(background, in: RoundedRectangle(cornerRadius: index.isMultiple(of: 2) ? 30 : 24))
            .overlay(RoundedRectangle(cornerRadius: index.isMultiple(of: 2) ? 30 : 24)
                .strokeBorder(themeManager.current.tint.opacity(isCorrect || isWrong ? 0 : 0.18)))
            .padding(.top, index % 3 == 1 ? 7 : 0)
        }
        .buttonStyle(PracticeButtonStyle())
        .disabled(question.isResolved || isWrong)
        .accessibilityLabel("\(answer)\(isCorrect ? ", correct answer" : isWrong ? ", incorrect answer" : "")")
    }

    private func completion(_ session: PracticeSession) -> some View {
        VStack(spacing: 24) {
            HeroCard {
                VStack(spacing: 20) {
                    Image(systemName: "checkmark.circle.fill").font(.system(size: 92)).foregroundStyle(.mint)
                    Text(viewModel.isDayLocked ? "A brilliant day's work." : "Today's twenty. Done.")
                        .font(.largeTitle.bold()).multilineTextAlignment(.center)
                    Text("\(PracticeSession.target) answers you knew.\nThat's something to feel good about.")
                        .multilineTextAlignment(.center).opacity(0.8)
                }
            }
            Label("\(viewModel.streak) day streak", systemImage: "flame.fill").font(.title2.bold()).foregroundStyle(.orange)
            if viewModel.canStartExtraPractice {
                PrimaryAction(title: "One more? Extra practice", symbol: "plus.circle") {
                    viewModel.perform(.start(extra: true, difficulty: session.difficulty))
                }
                Text("Optional: another \(PracticeSession.target) correct answers. Your streak is already secured.")
                    .font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
            } else {
                Label("All done. Come back tomorrow.", systemImage: "moon.stars.fill").font(.headline)
                Text("Both sessions are complete. Practice unlocks at local midnight.")
                    .font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
            }
        }
    }
}
