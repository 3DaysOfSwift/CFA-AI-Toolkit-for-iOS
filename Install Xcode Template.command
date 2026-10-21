#!/bin/zsh
set -eu
cd "$(dirname "$0")"
destination_root="${CFA_TEMPLATE_DESTINATION:-$HOME/Library/Developer/Xcode/Templates}"
relative_directory="Project Templates/iOS/Application"
template_names=("CFA App" "Habit Tracker" "Day Streak")

finish() {
  local result_code=$?
  if [[ -t 0 ]]; then
    echo ""
    read -r "?Press Return to close this window. "
  fi
  exit "$result_code"
}
trap finish EXIT

# Preflight all destinations before replacing any template.
for template_name in "${template_names[@]}"; do
  template_source="$PWD/templates/Xcode/$relative_directory/$template_name.xctemplate"
  template_destination="$destination_root/$relative_directory/$template_name.xctemplate"
  if [[ ! -f "$template_source/TemplateInfo.plist" ]]; then
    echo "Missing template: $template_source"
    exit 1
  fi
  if [[ -L "$template_destination" ]]; then
    echo "Refusing to replace a symlink: $template_destination"
    exit 1
  fi
  if [[ -e "$template_destination" ]]; then
    marker="$template_destination/CFA-TEMPLATE.json"
    product=$(/usr/bin/plutil -extract product raw -o - "$marker" 2>/dev/null || true)
    installed_name=$(/usr/bin/plutil -extract template raw -o - "$marker" 2>/dev/null || true)
    if [[ "$product" != "cooperative-feature-architecture" || "$installed_name" != "$template_name" ]]; then
      echo "Refusing to replace a template not installed by CFA: $template_destination"
      exit 1
    fi
  fi
done

for template_name in "${template_names[@]}"; do
  template_source="$PWD/templates/Xcode/$relative_directory/$template_name.xctemplate"
  template_destination="$destination_root/$relative_directory/$template_name.xctemplate"
  mkdir -p "${template_destination:h}"
  if [[ -e "$template_destination" ]]; then
    backup_directory=$(mktemp -d "$destination_root/CFA-template-backup.XXXXXX")
    mv "$template_destination" "$backup_directory/"
    echo "Previous $template_name preserved at: $backup_directory"
  fi
  mkdir -p "$template_destination"
  /usr/bin/rsync -r --exclude='.DS_Store' --exclude='xcuserdata' "$template_source/" "$template_destination/"
  echo "$template_name is installed in Xcode at: $template_destination"
done
echo "Quit and reopen Xcode, then choose File → New → Project → iOS → CFA App, Habit Tracker or Day Streak."
