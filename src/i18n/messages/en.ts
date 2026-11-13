/** English is the source of truth: every other language must define exactly these keys. */
export const en = {
  // Common
  'common.back': 'Back',
  'common.cancel': 'Cancel',
  'common.tryAgain': 'Try again',
  'common.loading': 'Loading…',
  'common.pleaseWait': 'Please wait…',
  'common.somethingWrong': 'Something went wrong',
  'common.you': 'You',
  'common.youSuffix': '{name} (you)',
  'common.partner': 'Partner',
  'common.deleting': 'Deleting…',
  'common.working': 'Working…',
  'common.generating': 'Generating…',
  'common.saving': 'Saving…',
  'common.saved': 'Saved.',

  // App shell
  'app.offline': "You're offline. Changes can't be saved until you're back online.",
  'app.realtimePaused': "Live updates are paused. We're refreshing periodically instead.",
  'app.addExpense': 'Add expense',
  'app.notConfigured.title': "Supabase isn't configured",
  'app.notConfigured.body':
    'Copy {envExample} to {env} and set {url} and {key}, then restart the dev server. See the README.',
  'app.tagline': 'A private shared expense tracker for two.',

  // Navigation
  'nav.main': 'Main',
  'nav.history': 'History',
  'nav.stats': 'Stats',
  'nav.account': 'Account',

  // Language
  'language.label': 'Language',
  'language.en': 'English',
  'language.es': 'Español',
  'language.sk': 'Slovenčina',

  // Account
  'account.title': 'Account',
  'account.signIn': 'Sign-in',
  'account.secure.title': 'Secure your account',
  'account.secure.body':
    'Right now your identity only exists on this device. Add an email and password so you can sign in again if you change phone, clear browser data or reinstall the app. Your shared space and expenses stay exactly as they are.',
  'account.secured': 'Done — your account is secured.',
  'account.signedInAs': 'Signed in as',
  'account.newDevice':
    'On a new device, open TwoBalance, choose “Sign in”, enter this email and your password.',
  'account.signOut': 'Sign out on this device',
  'account.signOut.title': 'Sign out?',
  'account.signOut.message': "You'll need your email and password to sign back in on this device.",
  'account.signOut.confirm': 'Sign out',

  // Credentials form
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.emailPlaceholder': 'you@example.com',
  'auth.validEmail': 'Enter a valid email address.',
  'auth.passwordMin': 'Use a password of at least {n} characters.',
  'auth.enterPassword': 'Enter your password.',
  'auth.secureMyAccount': 'Secure my account',
  'auth.signIn': 'Sign in',

  // Sign-in screen / lost session
  'signin.title': 'Sign in',
  'signin.body':
    'Sign in to your TwoBalance account. Enter the email and password you set under Account.',
  'signin.cantStart': "Can't start the app",
  'lost.title': 'Session unavailable',
  'lost.body1':
    'This browser used to be signed in to a shared space, but that sign-in is gone. This happens if site data was cleared, the browser or device changed, or the app was reinstalled.',
  'lost.body2':
    'Your expenses are not deleted. If you secured your account with an email and password, sign in to get straight back to your space.',
  'lost.checkAgain': 'Check again',
  'lost.startOver': 'I never set an email — start over',
  'lost.startOverHint':
    "Starting over creates a brand-new identity; an identity without an email can't be recovered, and you'll create or join a space again. Your partner can still export the old data as CSV.",

  // Onboarding / space form
  'onboarding.haveAccount': 'Already have an account? Sign in',
  'onboarding.noPasswords':
    'There are no passwords: this device keeps an anonymous sign-in. After creating or joining a space, add an email and password under Account so you can sign in again on a new device.',
  'spaces.loading': 'Loading your spaces…',
  'spaceForm.tabs': 'Create or join',
  'spaceForm.createTab': 'Create shared space',
  'spaceForm.joinTab': 'Join with a code',
  'spaceForm.spaceName': 'Space name',
  'spaceForm.spaceNamePlaceholder': 'e.g. Home, Rome trip',
  'spaceForm.whoFor': 'Who is it for?',
  'spaceForm.withPartner': 'Me and a partner',
  'spaceForm.withPartnerHint': 'Split 50/50',
  'spaceForm.justMe': 'Just me',
  'spaceForm.justMeHint': 'Track my own spending',
  'spaceForm.yourName': 'Your name',
  'spaceForm.yourNamePlaceholder': 'e.g. Alex',
  'spaceForm.code': 'Invitation code',
  'spaceForm.errName': 'Enter your name (max 40 characters).',
  'spaceForm.errSpace': 'Give the space a name (max 40 characters).',
  'spaceForm.errCode': 'Enter the 12-character code from your partner.',
  'spaceForm.createMine': 'Create my space',
  'spaceForm.createShared': 'Create shared space',
  'spaceForm.join': 'Join shared space',
  'newSpace.title': 'Add a space',

  // Space switcher
  'switcher.justYou': 'Just you',
  'switcher.with': 'With {name}',
  'switcher.waiting': 'Waiting for your partner',
  'switcher.aria': '{name}. Switch space',
  'switcher.menu': 'Your spaces',
  'switcher.add': 'Add another space',

  // Space settings
  'settings.title': 'Space settings',
  'settings.for': 'For “{name}”. Switch or add spaces from the title on the dashboard.',
  'settings.rename': 'Rename',
  'settings.saveName': 'Save name',
  'settings.errName': 'Enter a name (max 40 characters).',
  'settings.invite.title': 'Invite a partner',
  'settings.invite.body':
    'This space is just for you. Invite someone to split expenses with — it then becomes a shared 50/50 space.',
  'settings.inviteCode.title': 'Invitation code',
  'settings.inviteCode.body': 'Send this one-time code to your partner. It expires in 7 days.',
  'settings.solo.title': 'Change to single-person',
  'settings.solo.withPartner':
    'You and {partner} each get your own single-person copy with all expenses, and the shared space is removed.',
  'settings.solo.noPartner':
    'Turns this space into a single-person space. You can invite a partner again later.',
  'settings.solo.button': 'Change to single-person…',
  'settings.solo.dialogTitle': 'Change to single-person?',
  'settings.solo.dialogWithPartner':
    "This creates a single-person copy of “{name}” for you and another for {partner}, each with all expenses. The shared space is then removed for both of you. This can't be undone.",
  'settings.solo.dialogNoPartner':
    '“{name}” becomes a single-person space. You can invite a partner again later.',
  'settings.solo.confirm': 'Change to single-person',
  'settings.delete.title': 'Delete space',
  'settings.delete.withPartner':
    'Permanently deletes this space and all its expenses for you and {partner}.',
  'settings.delete.noPartner': 'Permanently deletes this space and all its expenses.',
  'settings.delete.button': 'Delete space…',
  'settings.delete.dialogTitle': 'Delete this space?',
  'settings.delete.dialogMessage':
    "This permanently deletes “{name}” and all its expenses. This can't be undone. Export a CSV from History first if you want a backup.",
  'settings.delete.dialogMessageWithPartner':
    "This permanently deletes “{name}” and all its expenses for you and {partner}. This can't be undone. Export a CSV from History first if you want a backup.",
  'settings.delete.confirm': 'Delete space',

  // Invitations
  'invite.shareTitle': 'TwoBalance invitation',
  'invite.shareText': 'Join me on TwoBalance. Open {url} and use this invitation code: {code}',
  'invite.codeAria': 'Invitation code {code}',
  'invite.copyCode': 'Copy code',
  'invite.share': 'Share',
  'invite.codeCopied': 'Code copied.',
  'invite.copyFailed': 'Could not copy — please copy the code manually.',
  'invite.invitationCopied': 'Invitation copied.',
  'reveal.title': 'Your space is ready',
  'reveal.body':
    'Send this one-time code to your partner. They open TwoBalance on their phone, enter their name and this code. It works once and expires in 7 days.',
  'reveal.shownOnce':
    'This code is shown only now. If you lose it before your partner joins, you can generate a new one from the dashboard.',
  'reveal.continue': 'Continue to dashboard',

  // Dashboard
  'dash.loadingBalance': 'Loading balance…',
  'dash.recent': 'Recent expenses',
  'dash.seeAll': 'See all',
  'dash.empty.title': 'No expenses yet',
  'dash.empty.hint': 'Add your first shared expense to get started.',
  'dash.nudge.title': 'Secure your account',
  'dash.nudge.body':
    'Add an email and password so you can get back in if you change phone or clear browser data.',
  'dash.nudge.cta': 'Add email',
  'dash.waiting.title': 'Waiting for your partner',
  'dash.waiting.body':
    "Your partner hasn't joined yet. Generate an invitation code and send it to them.",
  'dash.waiting.cta': 'Get invitation code',

  // Balance
  'balance.totalSpent': 'Total spent',
  'balance.yourBalance': 'Your balance',
  'balance.owed': 'You are owed {amount}',
  'balance.owe': 'You owe {amount}',
  'balance.settled': "You're all settled.",

  // Expense form & pages
  'expense.amount': 'Amount (€)',
  'expense.description': 'Description (optional)',
  'expense.descriptionPlaceholder': 'e.g. Groceries',
  'expense.category': 'Category',
  'expense.selectCategory': 'Select a category…',
  'expense.date': 'Date',
  'expense.paidBy': 'Paid by',
  'expense.split': 'Split 50/50 between you and your partner.',
  'expense.errDescription': 'Keep the description under 120 characters.',
  'expense.errCategory': 'Choose a category.',
  'expense.errDate': 'Enter a valid date.',
  'expense.delete': 'Delete expense',
  'expense.add.title': 'Add expense',
  'expense.add.save': 'Save expense',
  'expense.edit.title': 'Edit expense',
  'expense.edit.save': 'Save changes',
  'expense.notFound': 'Expense not found',
  'expense.notFoundHint': 'It may have been deleted.',
  'expense.deleteDialog.title': 'Delete this expense?',
  'expense.deleteDialog.message':
    'It will be removed from the history, both balances and the statistics.',
  'expense.deleteDialog.confirm': 'Delete',

  // Amount parsing
  'amount.enter': 'Enter an amount.',
  'amount.twoDecimals': 'Use at most two decimal places.',
  'amount.invalid': 'Enter a valid amount, e.g. 12.50.',
  'amount.positive': 'Amount must be greater than zero.',
  'amount.tooLarge': 'Amount is too large (max 1,000,000).',

  // History
  'history.title': 'History',
  'history.filters': 'Filters',
  'history.from': 'From',
  'history.to': 'To',
  'history.paidBy': 'Paid by',
  'history.everyone': 'Everyone',
  'history.category': 'Category',
  'history.allCategories': 'All categories',
  'history.rangeInvalid': '"From" must be on or before "To".',
  'history.clear': 'Clear filters',
  'history.noMatch': 'No expenses match these filters',
  'history.noMatchHint': 'Try widening the date range or clearing filters.',
  'history.none': 'No expenses yet',
  'history.noneHint': 'Add your first shared expense.',
  'history.limit': 'Showing the latest {n}. Narrow the filters or export CSV to see everything.',
  'history.export': 'Export all expenses (CSV)',
  'history.exporting': 'Preparing…',
  'history.exportConfirm.title': 'Download all expenses?',
  'history.exportConfirm.message':
    'This saves a CSV file with every expense in this space to your device.',
  'history.exportConfirm.confirm': 'Download CSV',

  // CSV
  'csv.date': 'Date',
  'csv.description': 'Description',
  'csv.category': 'Category',
  'csv.paidBy': 'Paid by',
  'csv.amount': 'Amount (EUR)',

  // Statistics
  'stats.title': 'Statistics',
  'stats.period': 'Period',
  'stats.thisMonth': 'This month',
  'stats.lastMonth': 'Last month',
  'stats.last30': 'Last 30 days',
  'stats.thisYear': 'This year',
  'stats.custom': 'Custom',
  'stats.rangeInvalid': 'Choose a valid range: "From" must be on or before "To".',
  'stats.empty': 'No spending in this period',
  'stats.emptyHint': 'Pick another period or add an expense.',
  'stats.totalSolo': 'Total spending',
  'stats.totalShared': 'Total shared spending',
  'stats.byCategory': 'By category',
  'stats.paidBy': 'Paid by',
  'stats.unknownCategory': 'Unknown',

  // Categories (keyed by the last digit of the stable seeded database id)
  'category.1': 'Groceries',
  'category.2': 'Restaurants',
  'category.3': 'Transport',
  'category.4': 'Accommodation',
  'category.5': 'Entertainment',
  'category.6': 'Household',
  'category.7': 'Shopping',
  'category.8': 'Health',
  'category.9': 'Other',

  // Errors
  'error.invalid_invite': 'That invitation code is invalid, already used, or has expired.',
  'error.couple_full': 'This shared space already has two members.',
  'error.already_member': 'You are already a member of this space.',
  'error.already_solo': 'This space is already single-person.',
  'error.invalid_space_name': 'Enter a space name between 1 and 40 characters.',
  'error.invalid_display_name': 'Enter a name between 1 and 40 characters.',
  'error.not_authenticated': 'Your session is missing or expired.',
  'error.not_a_member': "You're not a member of a shared space.",
  'error.invalid_category': 'Please choose a valid category.',
  'error.expenses_amount_check': 'Amount must be greater than zero and at most 1,000,000.',
  'error.expenses_description_check': 'Description can be at most 120 characters.',
  'error.email_exists': 'That email is already linked to an account. Use "Sign in" instead.',
  'error.over_request_rate_limit': 'Too many attempts. Wait a few minutes and try again.',
  'error.validation_failed': 'Check the email and password and try again.',
  'error.invalid_credentials': 'Wrong email or password.',
  'error.weak_password': 'That password is too weak. Use at least 8 characters.',
  'error.same_password': 'That is already your password.',
  'error.email_not_confirmed':
    'This email is not confirmed yet. In Supabase, turn off "Confirm email".',
  'error.email_address_invalid': 'Enter a valid email address.',
  'error.network': "You appear to be offline or the server can't be reached. Try again.",
  'error.permission': "You don't have permission to do that.",
  'error.unknown': 'Something went wrong. Please try again.',
} as const

export type MessageKey = keyof typeof en
export type Messages = Record<MessageKey, string>
