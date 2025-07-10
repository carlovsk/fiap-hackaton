#!/usr/bin/env sh
if [ -z "$husky_skip_init" ]; then
  debug() {
    [ "$HUSKY_DEBUG" = "1" ] && echo "$@" >&2
  }
  readonly hook_name="$(basename "$0")"
  debug "husky > $hook_name (node $(node -v))"

  if [ "$HUSKY" = "0" ]; then
    debug "HUSKY env variable is set to 0, skipping hook"
    exit 0
  fi

  if [ -f ~/.huskyrc ]; then
    . ~/.huskyrc
  fi

  export husky_skip_init=1
  sh -e "$0" "$@"
  exit $?
fi
