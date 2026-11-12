import SwiftUI

struct RootTabView: View {
    @State private var viewModel = RootTabViewModel()

    var body: some View {
        TabView(selection: $viewModel.selectedTab) {
            GitReposView()
                .tabItem { Label("Git Repos", systemImage: "chevron.left.forwardslash.chevron.right") }
                .tag(RootTabViewModel.Tab.gitRepos)

            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
                .tag(RootTabViewModel.Tab.settings)
        }
    }
}
