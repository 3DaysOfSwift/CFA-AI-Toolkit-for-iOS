#!/bin/zsh
cd "$(dirname "$0")"
template_source="$PWD/templates/Xcode/Project Templates/iOS/Application/CFA App.xctemplate"
template_destination="$HOME/Library/Developer/Xcode/Templates/Project Templates/iOS/Application/CFA App.xctemplate"
legacy_template_destination="$HOME/Library/Developer/Xcode/Templates/Project Templates/iOS/Application/CFA iOS App.xctemplate"

if [[ ! -f "$template_source/TemplateInfo.plist" ]]; then
  echo "CFA App template files are missing from this CFA AI Toolkit for iOS folder."
  result_code=1
elif [[ -e "$legacy_template_destination" ]]; then
  marker="$legacy_template_destination/CFA-TEMPLATE.json"
  if [[ -f "$marker" ]] && grep -q '"cooperative-feature-architecture"' "$marker"; then
    rm -rf "$legacy_template_destination"
    exec "$0"
  else
    echo "An older CFA iOS App template exists, but it was not installed by CFA."
    echo "It has not been changed. Remove it manually before installing CFA App."
    result_code=1
  fi
elif [[ -e "$template_destination" ]]; then
  marker="$template_destination/CFA-TEMPLATE.json"
  if [[ -f "$marker" ]] && grep -q '"cooperative-feature-architecture"' "$marker"; then
    rm -rf "$template_destination"
    mkdir -p "${template_destination:h}"
    ditto "$template_source" "$template_destination"
    result_code=$?
    if [[ $result_code -eq 0 ]]; then
      echo "CFA App was updated in Xcode."
      echo "Quit and reopen Xcode, then choose File → New → Project → iOS → CFA App."
    fi
  else
    echo "A template already exists at this location, but it was not installed by CFA."
    echo "It has not been changed."
    result_code=1
  fi
else
  mkdir -p "${template_destination:h}"
  ditto "$template_source" "$template_destination"
  result_code=$?
  if [[ $result_code -eq 0 ]]; then
    echo "CFA App is installed in Xcode."
    echo "Quit and reopen Xcode, then choose File → New → Project → iOS → CFA App."
  fi
fi
echo ""
read -r "?Press Return to close this window. "
exit $result_code
