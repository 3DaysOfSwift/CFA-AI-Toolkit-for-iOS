import SwiftUI

struct GitReposView: View {
    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.colorScheme) private var colorScheme
    @State private var viewModel = GitReposViewModel()

    var body: some View {
        let resolvedTheme = themeManager.selectedTheme.resolved(for: colorScheme)
        let palette = resolvedTheme.palette

        NavigationStack {
            Group {
                if viewModel.repos.isEmpty, viewModel.isRefreshing {
                    ProgressView("Downloading GitHub repositories…")
                        .tint(palette.tint)
                } else if viewModel.repos.isEmpty, let message = viewModel.refreshFailureMessage {
                    failureCard(message, palette: palette)
                } else if viewModel.repos.isEmpty {
                    ContentUnavailableView("No Git Repositories", systemImage: "tray")
                        .foregroundStyle(palette.primaryText)
                } else {
                    repoList(viewModel.repos, palette: palette)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(palette.background)
            .navigationTitle("Git Repos")
            .toolbarColorScheme(resolvedTheme.colorScheme, for: .navigationBar)
            .safeAreaInset(edge: .bottom) {
                if !viewModel.repos.isEmpty, viewModel.isRefreshing {
                    ProgressView("Refreshing GitHub repositories…")
                        .tint(palette.tint)
                        .foregroundStyle(palette.primaryText)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(palette.surface)
                } else if !viewModel.repos.isEmpty, let message = viewModel.refreshFailureMessage {
                    VStack(spacing: 8) {
                        Text(message)
                            .font(.footnote)
                        Button("Try again") { viewModel.refresh() }
                            .buttonStyle(.borderedProminent)
                            .tint(palette.tint)
                    }
                    .foregroundStyle(palette.primaryText)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(palette.surface)
                }
            }
        }
    }

    private func repoList(_ repos: [Repo], palette: ThemePalette) -> some View {
        List(repos, id: \.id) { repo in
            VStack(alignment: .leading, spacing: 8) {
                Link(repo.fullName, destination: repo.repositoryURL)
                    .font(.headline)
                    .foregroundStyle(palette.primaryText)
                Text(repo.summary)
                    .font(.subheadline)
                    .foregroundStyle(palette.secondaryText)
                Label("\(repo.stars) GitHub stars", systemImage: "star.fill")
                    .font(.footnote)
                    .foregroundStyle(palette.tint)
            }
            .padding(.vertical, 6)
            .listRowBackground(palette.surface)
        }
        .scrollContentBackground(.hidden)
    }

    private func failureCard(_ message: String, palette: ThemePalette) -> some View {
        ContentUnavailableView {
            Label("GitHub unavailable", systemImage: "wifi.exclamationmark")
        } description: {
            Text(message)
        } actions: {
            Button("Try again") {
                viewModel.refresh()
            }
            .buttonStyle(.borderedProminent)
            .tint(palette.tint)
        }
        .foregroundStyle(palette.primaryText)
        .padding()
    }
}
