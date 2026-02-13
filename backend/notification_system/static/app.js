const state = {
  rules: [],
  history: [],
  options: {
    categories: [],
    players: [],
    tournaments: [],
    tour: 'both',
  },
  openDropdown: null,
};

const COUNTRY_ALPHA3_TO_ALPHA2 = {
  AUS: 'AU', AUT: 'AT', BEL: 'BE', BGR: 'BG', BLR: 'BY', BRA: 'BR', CAN: 'CA', CHE: 'CH',
  CHN: 'CN', CZE: 'CZ', DEU: 'DE', DEN: 'DK', ESP: 'ES', EST: 'EE', FIN: 'FI', FRA: 'FR',
  GBR: 'GB', GEO: 'GE', GRC: 'GR', HRV: 'HR', HUN: 'HU', IRL: 'IE', ITA: 'IT', JPN: 'JP',
  KAZ: 'KZ', LVA: 'LV', NLD: 'NL', NOR: 'NO', POL: 'PL', PRT: 'PT', ROU: 'RO', RUS: 'RU',
  SRB: 'RS', SVK: 'SK', SVN: 'SI', SWE: 'SE', TUR: 'TR', UKR: 'UA', USA: 'US',
};

const EVENT_TYPE_META = {
  upcoming_match: {
    hint: 'Alert for scheduled matches that satisfy your filters.',
    scopes: ['categories', 'tournaments', 'players', 'round_filters', 'extra_conditions'],
    params: [],
  },
  live_match_starts: {
    hint: 'Alert once when a selected match becomes live.',
    scopes: ['categories', 'tournaments', 'players', 'extra_conditions'],
    params: [],
  },
  set_completed: {
    hint: 'Alert when selected match completes a set threshold.',
    scopes: ['categories', 'tournaments', 'players', 'extra_conditions'],
    params: ['set_number'],
  },
  match_result: {
    hint: 'Alert when a completed result matches your filters.',
    scopes: ['categories', 'tournaments', 'players', 'round_filters', 'extra_conditions'],
    params: [],
  },
  upset_alert: {
    hint: 'Alert for result upsets where lower-ranked player beats higher-ranked player.',
    scopes: ['categories', 'tournaments', 'players', 'extra_conditions'],
    params: ['upset_min_rank_gap'],
  },
  close_match_deciding_set: {
    hint: 'Alert for deciding-set or tie-break heavy close matches.',
    scopes: ['categories', 'tournaments', 'players', 'extra_conditions'],
    params: ['deciding_mode'],
  },
  player_reaches_round: {
    hint: 'Track when a specific player reaches selected round or above.',
    scopes: ['categories', 'tournaments', 'players', 'tracked_player', 'round_filters', 'extra_conditions'],
    params: [],
    requiresTracked: true,
  },
  tournament_stage_reminder: {
    hint: 'Alert for QF/SF/F upcoming or live matches in selected events.',
    scopes: ['categories', 'tournaments', 'players', 'extra_conditions'],
    params: ['stage_rounds'],
  },
  surface_specific_result: {
    hint: 'Alert only for match results on selected surface.',
    scopes: ['categories', 'tournaments', 'players', 'extra_conditions'],
    params: ['surface_value'],
  },
  time_window_schedule_alert: {
    hint: 'Alert for upcoming matches in the next N hours.',
    scopes: ['categories', 'tournaments', 'players', 'extra_conditions'],
    params: ['window_hours'],
  },
  ranking_milestone: {
    hint: 'Track ranking milestones (Top 100/50/20/10 or career high).',
    scopes: ['players', 'tracked_player'],
    params: ['ranking_milestone', 'emit_on_first_seen'],
    requiresPlayerSelection: true,
  },
  title_milestone: {
    hint: 'Track title count milestones for selected players.',
    scopes: ['players', 'tracked_player'],
    params: ['title_target', 'emit_on_first_seen'],
    requiresPlayerSelection: true,
  },
  head_to_head_breaker: {
    hint: 'Alert when tracked player breaks a losing streak against rival.',
    scopes: ['tracked_player', 'categories', 'tournaments', 'extra_conditions'],
    params: ['rival_player', 'h2h_min_losses'],
    requiresTracked: true,
  },
  tournament_completed: {
    hint: 'Alert when tournament finals are completed.',
    scopes: ['categories', 'tournaments', 'players', 'extra_conditions'],
    params: [],
  },
};

const CONDITION_OPTIONS = {
  tournament_name: { operators: ['contains', 'equals'], suggestions: [], placeholder: 'Tournament name' },
  player_name: { operators: ['contains', 'equals'], suggestions: [], placeholder: 'Player name' },
  category: { operators: ['contains', 'equals'], suggestions: [], placeholder: 'Category code' },
  surface: { operators: ['contains', 'equals'], suggestions: ['Hard', 'Clay', 'Grass', 'Indoor'], placeholder: 'Surface' },
  round_rank: { operators: ['equals', 'gte', 'lte'], suggestions: ['1', '2', '3', '4', '5', '6', '7'], placeholder: 'Numeric rank' },
};

const el = {
  smtpStatusPill: document.getElementById('smtpStatusPill'),
  schedulerPill: document.getElementById('schedulerPill'),
  emailInput: document.getElementById('emailInput'),
  enabledInput: document.getElementById('enabledInput'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  runNowBtn: document.getElementById('runNowBtn'),
  testEmailBtn: document.getElementById('testEmailBtn'),
  settingsMessage: document.getElementById('settingsMessage'),

  ruleForm: document.getElementById('ruleForm'),
  ruleIdInput: document.getElementById('ruleIdInput'),
  ruleNameInput: document.getElementById('ruleNameInput'),
  eventTypeInput: document.getElementById('eventTypeInput'),
  eventTypeHint: document.getElementById('eventTypeHint'),
  tourInput: document.getElementById('tourInput'),
  roundModeInput: document.getElementById('roundModeInput'),
  roundValueInput: document.getElementById('roundValueInput'),
  conditionGroupInput: document.getElementById('conditionGroupInput'),
  ruleEnabledInput: document.getElementById('ruleEnabledInput'),
  stepChip1: document.getElementById('stepChip1'),
  stepChip2: document.getElementById('stepChip2'),
  stepChip3: document.getElementById('stepChip3'),
  builderProgressHint: document.getElementById('builderProgressHint'),
  layerCore: document.getElementById('layerCore'),
  layerScope: document.getElementById('layerScope'),
  layerDelivery: document.getElementById('layerDelivery'),
  categoriesInput: document.getElementById('categoriesInput'),
  tournamentsInput: document.getElementById('tournamentsInput'),
  playersInput: document.getElementById('playersInput'),
  trackedPlayerInput: document.getElementById('trackedPlayerInput'),
  trackedPlayerField: document.getElementById('trackedPlayerField'),
  conditionsList: document.getElementById('conditionsList'),
  addConditionBtn: document.getElementById('addConditionBtn'),
  resetFormBtn: document.getElementById('resetFormBtn'),
  saveActions: document.getElementById('saveActions'),
  saveRuleBtn: document.getElementById('saveRuleBtn'),
  ruleRequiredHint: document.getElementById('ruleRequiredHint'),
  ruleMessage: document.getElementById('ruleMessage'),

  severityInput: document.getElementById('severityInput'),
  cooldownInput: document.getElementById('cooldownInput'),
  channelEmail: document.getElementById('channelEmail'),
  channelTelegram: document.getElementById('channelTelegram'),
  channelDiscord: document.getElementById('channelDiscord'),
  channelWebPush: document.getElementById('channelWebPush'),
  quietHoursEnabledInput: document.getElementById('quietHoursEnabledInput'),
  quietStartHourInput: document.getElementById('quietStartHourInput'),
  quietEndHourInput: document.getElementById('quietEndHourInput'),
  timezoneOffsetInput: document.getElementById('timezoneOffsetInput'),

  paramSetNumber: document.getElementById('paramSetNumber'),
  paramUpsetGap: document.getElementById('paramUpsetGap'),
  paramDecidingMode: document.getElementById('paramDecidingMode'),
  paramRankingMilestone: document.getElementById('paramRankingMilestone'),
  paramTitleTarget: document.getElementById('paramTitleTarget'),
  paramRivalPlayerInput: document.getElementById('paramRivalPlayerInput'),
  paramH2HLosses: document.getElementById('paramH2HLosses'),
  paramSurfaceValue: document.getElementById('paramSurfaceValue'),
  paramWindowHours: document.getElementById('paramWindowHours'),
  paramStageQF: document.getElementById('paramStageQF'),
  paramStageSF: document.getElementById('paramStageSF'),
  paramStageF: document.getElementById('paramStageF'),
  paramEmitFirstSeen: document.getElementById('paramEmitFirstSeen'),

  rulesContainer: document.getElementById('rulesContainer'),
  ruleCount: document.getElementById('ruleCount'),
  historyContainer: document.getElementById('historyContainer'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  conditionValueSuggestions: document.getElementById('conditionValueSuggestions'),

  categoriesDropdownBtn: document.getElementById('categoriesDropdownBtn'),
  categoriesDropdown: document.getElementById('categoriesDropdown'),
  tournamentsDropdownBtn: document.getElementById('tournamentsDropdownBtn'),
  tournamentsDropdown: document.getElementById('tournamentsDropdown'),
  playersDropdownBtn: document.getElementById('playersDropdownBtn'),
  playersDropdown: document.getElementById('playersDropdown'),
  trackedPlayerDropdownBtn: document.getElementById('trackedPlayerDropdownBtn'),
  trackedPlayerDropdown: document.getElementById('trackedPlayerDropdown'),
  paramRivalPlayerDropdownBtn: document.getElementById('paramRivalPlayerDropdownBtn'),
  paramRivalPlayerDropdown: document.getElementById('paramRivalPlayerDropdown'),
};

function splitCsv(text) {
  return String(text || '').split(',').map((x) => x.trim()).filter(Boolean);
}

function parseIntSafe(value, fallback = 0) {
  const out = Number.parseInt(value, 10);
  return Number.isFinite(out) ? out : fallback;
}

function appendCsvValue(input, value) {
  const current = splitCsv(input.value);
  if (!value || current.includes(value)) return;
  current.push(value);
  input.value = current.join(', ');
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function isoFlag(countryCode) {
  const raw = String(countryCode || '').trim().toUpperCase();
  if (!raw) return '🎾';
  const code = raw.length === 3 ? COUNTRY_ALPHA3_TO_ALPHA2[raw] || '' : raw;
  if (code.length !== 2) return '🎾';
  const cps = [...code].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...cps);
}

function setMessage(target, text, isError = false) {
  target.textContent = text || '';
  target.style.color = isError ? '#b9404f' : '#365a7b';
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const message = payload.error || payload.message || `Request failed: ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

function debounce(fn, wait = 220) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function getTokenForInput(inputEl) {
  const parts = String(inputEl.value || '').split(',');
  return parts[parts.length - 1].trim().toLowerCase();
}

function setConditionSuggestionList(values = []) {
  el.conditionValueSuggestions.innerHTML = values
    .map((value) => `<option value="${escapeHtml(value)}"></option>`)
    .join('');
}

function refreshConditionOptionSources() {
  CONDITION_OPTIONS.category.suggestions = state.options.categories.slice(0, 20);
  CONDITION_OPTIONS.player_name.suggestions = state.options.players.slice(0, 30).map((p) => p.name);
  CONDITION_OPTIONS.tournament_name.suggestions = state.options.tournaments.slice(0, 30).map((t) => t.name);
}

function updateConditionRowOptions(row) {
  const fieldEl = row.querySelector('.condition-field');
  const opEl = row.querySelector('.condition-operator');
  const valueEl = row.querySelector('.condition-value');
  const config = CONDITION_OPTIONS[fieldEl.value] || CONDITION_OPTIONS.tournament_name;
  const currentOperator = opEl.value;
  opEl.innerHTML = config.operators.map((operator) => `<option value="${operator}">${operator}</option>`).join('');
  opEl.value = config.operators.includes(currentOperator) ? currentOperator : config.operators[0];
  valueEl.placeholder = config.placeholder;
  setConditionSuggestionList(config.suggestions);
}

function createConditionRow(condition = {}) {
  const row = document.createElement('div');
  row.className = 'condition-row';
  row.innerHTML = `
    <select class="condition-field">
      <option value="tournament_name">🏟 Tournament Name</option>
      <option value="player_name">👤 Player Name</option>
      <option value="category">🏆 Category</option>
      <option value="surface">🌱 Surface</option>
      <option value="round_rank">🎯 Round Rank</option>
    </select>
    <select class="condition-operator"></select>
    <input class="condition-value" type="text" list="conditionValueSuggestions" placeholder="value">
    <button type="button" class="condition-remove">Remove</button>
  `;
  const fieldEl = row.querySelector('.condition-field');
  const opEl = row.querySelector('.condition-operator');
  const valueEl = row.querySelector('.condition-value');
  fieldEl.value = condition.field || 'tournament_name';
  updateConditionRowOptions(row);
  opEl.value = condition.operator || opEl.value;
  valueEl.value = condition.value || '';
  fieldEl.addEventListener('change', () => updateConditionRowOptions(row));
  valueEl.addEventListener('focus', () => {
    const config = CONDITION_OPTIONS[fieldEl.value] || CONDITION_OPTIONS.tournament_name;
    setConditionSuggestionList(config.suggestions);
  });
  row.querySelector('.condition-remove').addEventListener('click', () => {
    row.remove();
    refreshConditionButtonState();
  });
  return row;
}

function refreshConditionButtonState() {
  const count = el.conditionsList.querySelectorAll('.condition-row').length;
  el.addConditionBtn.disabled = count >= 3;
}

function serializeConditions() {
  const rows = [...el.conditionsList.querySelectorAll('.condition-row')];
  return rows
    .map((row) => ({
      field: row.querySelector('.condition-field').value,
      operator: row.querySelector('.condition-operator').value,
      value: row.querySelector('.condition-value').value.trim(),
    }))
    .filter((item) => item.field && item.operator && item.value);
}

function classifyTag(text) {
  const value = String(text || '').trim().toLowerCase();
  if (!value) return '';
  if (value.includes('grand_slam') || value.includes('grand slam')) return 'tag-slam';
  if (value.includes('1000')) return 'tag-1000';
  if (value.includes('500')) return 'tag-500';
  if (value.includes('250')) return 'tag-250';
  if (value.includes('hard')) return 'tag-hard';
  if (value.includes('clay')) return 'tag-clay';
  if (value.includes('grass')) return 'tag-grass';
  if (value.includes('indoor')) return 'tag-indoor';
  return '';
}

function renderTag(text) {
  const cls = classifyTag(text);
  return `<span class="tag ${cls}">${escapeHtml(text)}</span>`;
}

function toggleGroup(node, enabled) {
  if (!node) return;
  node.classList.toggle('disabled', !enabled);
  node.querySelectorAll('input, select, textarea, button').forEach((ctrl) => {
    if (ctrl.id === 'ruleEnabledInput') return;
    ctrl.disabled = !enabled;
  });
}

function setHidden(node, hidden) {
  if (!node) return;
  node.classList.toggle('is-hidden', !!hidden);
}

function setStepChipState(node, { active = false, completed = false } = {}) {
  if (!node) return;
  node.classList.toggle('active', !!active);
  node.classList.toggle('completed', !!completed);
}

function summarizeMissing(values) {
  const unique = [...new Set(values.filter(Boolean))];
  if (!unique.length) return '';
  if (unique.length <= 3) return unique.join(', ');
  return `${unique.slice(0, 3).join(', ')} +${unique.length - 3} more`;
}

function updateRoundUi() {
  const mode = el.roundModeInput.value;
  const anyMode = mode === 'any';
  if (anyMode) el.roundValueInput.value = '';
  el.roundValueInput.classList.toggle('soft-disabled', anyMode);
  updateGuidedFlowUi();
}

function updateQuietHoursUi() {
  const enabled = !!el.quietHoursEnabledInput.checked;
  document.querySelectorAll('.quiet-hours-group').forEach((node) => toggleGroup(node, enabled));
}

function getRuleBuilderRequiredStatus() {
  const payload = getRuleFormPayload();
  const eventType = payload.event_type;
  const coreMissing = [];
  const focusMissing = [];
  const deliveryMissing = [];

  if (!payload.name) coreMissing.push('Rule Name');
  if (!payload.event_type) coreMissing.push('Event Type');
  if (!payload.tour) coreMissing.push('Tour');

  if (payload.round_mode === 'min' || payload.round_mode === 'exact') {
    if (!payload.round_value) focusMissing.push('Round Value');
  }

  if (eventType === 'player_reaches_round' && !(payload.tracked_player || (payload.players || []).length)) {
    focusMissing.push('Tracked Player or Players');
  }
  if ((eventType === 'ranking_milestone' || eventType === 'title_milestone') && !(payload.tracked_player || (payload.players || []).length)) {
    focusMissing.push('Player Selection');
  }
  if (eventType === 'head_to_head_breaker') {
    if (!payload.tracked_player) focusMissing.push('Tracked Player');
    if (!payload.params.rival_player) focusMissing.push('Rival Player');
  }
  if (eventType === 'surface_specific_result' && !payload.params.surface_value) {
    focusMissing.push('Surface');
  }
  if (eventType === 'tournament_stage_reminder' && !(payload.params.stage_rounds || []).length) {
    focusMissing.push('Tournament Stages');
  }

  if (!(payload.channels || []).length) {
    deliveryMissing.push('At least one Channel');
  }

  const coreReady = coreMissing.length === 0;
  const focusReady = focusMissing.length === 0;
  const deliveryReady = deliveryMissing.length === 0;

  return {
    coreMissing,
    focusMissing,
    deliveryMissing,
    coreReady,
    focusReady,
    deliveryReady,
    saveReady: coreReady && focusReady && deliveryReady,
  };
}

function updateGuidedFlowUi() {
  const status = getRuleBuilderRequiredStatus();

  setHidden(el.layerScope, !status.coreReady);
  setHidden(el.layerDelivery, !(status.coreReady && status.focusReady));
  setHidden(el.saveActions, !status.saveReady);

  if (el.saveRuleBtn) el.saveRuleBtn.disabled = !status.saveReady;

  setStepChipState(el.stepChip1, {
    active: !status.coreReady,
    completed: status.coreReady,
  });
  setStepChipState(el.stepChip2, {
    active: status.coreReady && !status.focusReady,
    completed: status.coreReady && status.focusReady,
  });
  setStepChipState(el.stepChip3, {
    active: status.coreReady && status.focusReady && !status.saveReady,
    completed: status.saveReady,
  });

  if (el.builderProgressHint) {
    if (!status.coreReady) {
      el.builderProgressHint.textContent = `Step 1: complete required trigger fields (${summarizeMissing(status.coreMissing)}).`;
    } else if (!status.focusReady) {
      el.builderProgressHint.textContent = `Step 2: finish required event settings (${summarizeMissing(status.focusMissing)}).`;
    } else if (!status.deliveryReady) {
      el.builderProgressHint.textContent = `Step 3: pick at least one delivery channel (${summarizeMissing(status.deliveryMissing)}).`;
    } else {
      el.builderProgressHint.textContent = 'All required fields are complete. You can save the rule now.';
    }
  }

  if (el.ruleRequiredHint) {
    const missingAll = [...status.coreMissing, ...status.focusMissing, ...status.deliveryMissing];
    el.ruleRequiredHint.textContent = missingAll.length
      ? `Required now: ${summarizeMissing(missingAll)}.`
      : 'Required fields complete.';
  }
}

function updateEventUi() {
  const eventType = el.eventTypeInput.value;
  const meta = EVENT_TYPE_META[eventType] || EVENT_TYPE_META.upcoming_match;
  const activeScopes = new Set(meta.scopes || []);
  const activeParams = new Set(meta.params || []);

  if (el.eventTypeHint) el.eventTypeHint.textContent = meta.hint || 'Choose what should trigger this rule.';

  document.querySelectorAll('.scope-group').forEach((node) => {
    const scope = node.getAttribute('data-scope');
    toggleGroup(node, activeScopes.has(scope));
  });

  document.querySelectorAll('.param-group').forEach((node) => {
    const param = node.getAttribute('data-param');
    toggleGroup(node, activeParams.has(param));
  });

  el.trackedPlayerInput.required = !!meta.requiresTracked;
  if (!activeScopes.has('tracked_player')) {
    el.trackedPlayerInput.value = '';
  }
  if (!activeScopes.has('round_filters')) {
    el.roundModeInput.value = 'any';
    el.roundValueInput.value = '';
  }
  updateRoundUi();
}

function getSelectedChannels() {
  const channels = [];
  if (el.channelEmail.checked) channels.push('email');
  if (el.channelTelegram.checked) channels.push('telegram');
  if (el.channelDiscord.checked) channels.push('discord');
  if (el.channelWebPush.checked) channels.push('web_push');
  return channels;
}

function getStageRounds() {
  const rounds = [];
  if (el.paramStageQF.checked) rounds.push('QF');
  if (el.paramStageSF.checked) rounds.push('SF');
  if (el.paramStageF.checked) rounds.push('F');
  return rounds;
}

function getRuleParams() {
  return {
    set_number: parseIntSafe(el.paramSetNumber.value, 1),
    upset_min_rank_gap: parseIntSafe(el.paramUpsetGap.value, 20),
    deciding_mode: el.paramDecidingMode.value,
    ranking_milestone: el.paramRankingMilestone.value,
    title_target: parseIntSafe(el.paramTitleTarget.value, 1),
    rival_player: String(el.paramRivalPlayerInput.value || '').trim(),
    h2h_min_losses: parseIntSafe(el.paramH2HLosses.value, 2),
    surface_value: String(el.paramSurfaceValue.value || '').trim(),
    window_hours: parseIntSafe(el.paramWindowHours.value, 24),
    stage_rounds: getStageRounds(),
    emit_on_first_seen: !!el.paramEmitFirstSeen.checked,
  };
}

function getRuleFormPayload() {
  const eventType = el.eventTypeInput.value;
  const meta = EVENT_TYPE_META[eventType] || EVENT_TYPE_META.upcoming_match;
  const activeScopes = new Set(meta.scopes || []);
  const activeParams = new Set(meta.params || []);
  const params = getRuleParams();
  Object.keys(params).forEach((key) => {
    if (!activeParams.has(key)) delete params[key];
  });

  return {
    id: el.ruleIdInput.value.trim() || undefined,
    name: el.ruleNameInput.value.trim(),
    event_type: eventType,
    tour: el.tourInput.value,
    round_mode: activeScopes.has('round_filters') ? el.roundModeInput.value : 'any',
    round_value: activeScopes.has('round_filters') ? el.roundValueInput.value : '',
    condition_group: el.conditionGroupInput.value,
    enabled: el.ruleEnabledInput.checked,
    categories: activeScopes.has('categories') ? splitCsv(el.categoriesInput.value) : [],
    tournaments: activeScopes.has('tournaments') ? splitCsv(el.tournamentsInput.value) : [],
    players: activeScopes.has('players') ? splitCsv(el.playersInput.value) : [],
    tracked_player: activeScopes.has('tracked_player') ? el.trackedPlayerInput.value.trim() : '',
    conditions: activeScopes.has('extra_conditions') ? serializeConditions() : [],
    severity: el.severityInput.value,
    cooldown_minutes: parseIntSafe(el.cooldownInput.value, 0),
    channels: getSelectedChannels(),
    quiet_hours_enabled: !!el.quietHoursEnabledInput.checked,
    quiet_start_hour: parseIntSafe(el.quietStartHourInput.value, 23),
    quiet_end_hour: parseIntSafe(el.quietEndHourInput.value, 7),
    timezone_offset: el.timezoneOffsetInput.value,
    params,
  };
}

function resetRuleForm() {
  el.ruleForm.reset();
  el.ruleIdInput.value = '';
  el.ruleEnabledInput.checked = true;
  el.channelEmail.checked = true;
  el.conditionsList.innerHTML = '';
  refreshConditionButtonState();
  closeAllDropdowns();
  setMessage(el.ruleMessage, '');
  updateQuietHoursUi();
  updateEventUi();
}

function populateRuleForm(rule) {
  el.ruleIdInput.value = rule.id || '';
  el.ruleNameInput.value = rule.name || '';
  el.eventTypeInput.value = rule.event_type || 'upcoming_match';
  el.tourInput.value = rule.tour || 'both';
  el.roundModeInput.value = rule.round_mode || 'any';
  el.roundValueInput.value = rule.round_value || '';
  el.conditionGroupInput.value = rule.condition_group || 'all';
  el.ruleEnabledInput.checked = !!rule.enabled;
  el.categoriesInput.value = (rule.categories || []).join(', ');
  el.tournamentsInput.value = (rule.tournaments || []).join(', ');
  el.playersInput.value = (rule.players || []).join(', ');
  el.trackedPlayerInput.value = rule.tracked_player || '';

  el.severityInput.value = rule.severity || 'normal';
  el.cooldownInput.value = rule.cooldown_minutes || 0;
  const channels = new Set((rule.channels || ['email']).map((x) => String(x).toLowerCase()));
  el.channelEmail.checked = channels.has('email');
  el.channelTelegram.checked = channels.has('telegram');
  el.channelDiscord.checked = channels.has('discord');
  el.channelWebPush.checked = channels.has('web_push');
  el.quietHoursEnabledInput.checked = !!rule.quiet_hours_enabled;
  el.quietStartHourInput.value = String(rule.quiet_start_hour ?? 23);
  el.quietEndHourInput.value = String(rule.quiet_end_hour ?? 7);
  el.timezoneOffsetInput.value = rule.timezone_offset || '+00:00';

  const params = rule.params || {};
  el.paramSetNumber.value = String(params.set_number ?? 1);
  el.paramUpsetGap.value = String(params.upset_min_rank_gap ?? 20);
  el.paramDecidingMode.value = params.deciding_mode || 'deciding_set';
  el.paramRankingMilestone.value = params.ranking_milestone || 'top_100';
  el.paramTitleTarget.value = String(params.title_target ?? 1);
  el.paramRivalPlayerInput.value = params.rival_player || '';
  el.paramH2HLosses.value = String(params.h2h_min_losses ?? 2);
  el.paramSurfaceValue.value = params.surface_value || '';
  el.paramWindowHours.value = String(params.window_hours ?? 24);
  const stageSet = new Set(params.stage_rounds || ['QF', 'SF', 'F']);
  el.paramStageQF.checked = stageSet.has('QF');
  el.paramStageSF.checked = stageSet.has('SF');
  el.paramStageF.checked = stageSet.has('F');
  el.paramEmitFirstSeen.checked = params.emit_on_first_seen !== false;

  el.conditionsList.innerHTML = '';
  (rule.conditions || []).forEach((cond) => el.conditionsList.appendChild(createConditionRow(cond)));
  refreshConditionButtonState();
  updateQuietHoursUi();
  updateEventUi();
}

function renderRules() {
  el.ruleCount.textContent = String(state.rules.length);
  if (!state.rules.length) {
    el.rulesContainer.innerHTML = '<p class="muted">No rules yet.</p>';
    return;
  }
  el.rulesContainer.innerHTML = '';
  state.rules.forEach((rule) => {
    const card = document.createElement('div');
    card.className = 'rule-card';
    const tags = [
      rule.event_type,
      rule.tour,
      rule.severity ? `severity:${rule.severity}` : '',
      rule.round_mode === 'any' ? '' : `${rule.round_mode}:${rule.round_value || '-'}`,
      ...(rule.categories || []).slice(0, 3),
      ...((rule.conditions || []).filter((cond) => cond && cond.field === 'surface' && cond.value).map((cond) => cond.value)),
    ].filter(Boolean);
    card.innerHTML = `
      <div class="rule-top">
        <div>
          <div class="rule-name">${escapeHtml(rule.name || 'Untitled')}</div>
          <div class="rule-meta">
            ${tags.map((tag) => renderTag(tag)).join('')}
            <span class="tag">${rule.enabled ? 'enabled' : 'disabled'}</span>
          </div>
        </div>
        <div class="rule-actions">
          <button class="btn small" data-action="edit">Edit</button>
          <button class="btn small" data-action="toggle">${rule.enabled ? 'Disable' : 'Enable'}</button>
          <button class="btn small danger" data-action="delete">Delete</button>
        </div>
      </div>
      <div class="muted">Players: ${(rule.players || []).join(', ') || '-'} | Tournaments: ${(rule.tournaments || []).join(', ') || '-'} | Channels: ${(rule.channels || ['email']).join(', ')}</div>
    `;
    card.querySelector('[data-action="edit"]').addEventListener('click', () => {
      populateRuleForm(rule);
      window.scrollTo({ top: el.ruleForm.offsetTop - 16, behavior: 'smooth' });
    });
    card.querySelector('[data-action="toggle"]').addEventListener('click', async () => {
      try {
        await api(`/api/rules/${encodeURIComponent(rule.id)}`, {
          method: 'PUT',
          body: JSON.stringify({ ...rule, enabled: !rule.enabled }),
        });
        await loadState();
      } catch (error) {
        setMessage(el.ruleMessage, error.message, true);
      }
    });
    card.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!window.confirm(`Delete rule "${rule.name}"?`)) return;
      try {
        await api(`/api/rules/${encodeURIComponent(rule.id)}`, { method: 'DELETE' });
        await loadState();
      } catch (error) {
        setMessage(el.ruleMessage, error.message, true);
      }
    });
    el.rulesContainer.appendChild(card);
  });
}

function renderHistory() {
  if (!state.history.length) {
    el.historyContainer.innerHTML = '<p class="muted">No activity yet.</p>';
    return;
  }
  el.historyContainer.innerHTML = '';
  state.history.forEach((item) => {
    const div = document.createElement('div');
    div.className = `history-item ${item.level === 'error' ? 'error' : ''}`;
    div.innerHTML = `<div><b>${escapeHtml(item.message || '')}</b></div><div class="time">${escapeHtml(item.timestamp || '')}</div>`;
    el.historyContainer.appendChild(div);
  });
}

function renderStatusPills(data) {
  const smtpReady = !!data.smtp_ready;
  el.smtpStatusPill.textContent = smtpReady ? 'SMTP: Ready' : `SMTP: ${data.smtp_message || 'Not configured'}`;
  el.smtpStatusPill.className = smtpReady ? 'pill' : 'pill neutral';
  const seconds = Number(data.scheduler_seconds || 0);
  el.schedulerPill.textContent = `Scheduler: every ${seconds}s`;
}

async function loadState() {
  const payload = await api('/api/state');
  const data = payload.data || {};
  state.rules = data.rules || [];
  state.history = data.history || [];
  el.emailInput.value = data.email || '';
  el.enabledInput.checked = !!data.enabled;
  renderStatusPills(data);
  renderRules();
  renderHistory();
}

async function loadOptions(query = '') {
  const tour = el.tourInput.value || 'both';
  const qs = new URLSearchParams({ tour, query });
  try {
    const payload = await api(`/api/options?${qs.toString()}`);
    const data = payload.data || {};
    state.options = {
      categories: data.categories || [],
      players: data.players || [],
      tournaments: data.tournaments || [],
      tour: data.tour || tour,
    };
    refreshConditionOptionSources();
  } catch (error) {
    setMessage(el.ruleMessage, `Suggestion load failed: ${error.message}`, true);
  }
}

function normalizeOptionItem(raw, kind) {
  if (kind === 'categories') {
    return {
      label: raw,
      value: raw,
      emoji: raw.includes('slam') ? '🏆' : raw.includes('1000') ? '🥇' : raw.includes('500') ? '🎾' : '📌',
      sub: 'Tournament category',
      pill: '',
    };
  }
  if (kind === 'tournaments') {
    const category = raw.category || '';
    const surface = raw.surface || '';
    return {
      label: raw.name,
      value: raw.name,
      emoji: '🏟',
      sub: [category, surface].filter(Boolean).join(' · '),
      pill: String(raw.tour || '').toUpperCase(),
    };
  }
  const countryCode = String(raw.country || '').toUpperCase();
  const flag = isoFlag(countryCode);
  return {
    label: raw.name,
    value: raw.name,
    emoji: flag,
    flag,
    countryCode,
    sub: `Rank ${raw.rank || '-'} · ${String(raw.tour || '').toUpperCase()}`,
    pill: '',
    image: raw.image_url || '',
  };
}

function getItemsForDropdown(kind, query = '') {
  const q = String(query || '').trim().toLowerCase();
  let items = [];
  if (kind === 'categories') items = (state.options.categories || []).map((c) => normalizeOptionItem(c, kind));
  else if (kind === 'tournaments') items = (state.options.tournaments || []).map((t) => normalizeOptionItem(t, kind));
  else items = (state.options.players || []).map((p) => normalizeOptionItem(p, 'players'));
  if (!q) return items.slice(0, 40);
  return items.filter((item) => item.label.toLowerCase().includes(q)).slice(0, 40);
}

function renderDropdown(kind, inputEl, panelEl, multi = true) {
  const query = multi ? getTokenForInput(inputEl) : inputEl.value.trim().toLowerCase();
  const items = getItemsForDropdown(kind, query);
  const head = `<div class="dropdown-head">${items.length} suggestion${items.length === 1 ? '' : 's'} · ${String(state.options.tour || '').toUpperCase()}</div>`;
  if (!items.length) {
    panelEl.innerHTML = `${head}<div class="dropdown-empty">No matches. Try a different keyword.</div>`;
    return;
  }
  panelEl.innerHTML = `
    ${head}
    ${items.map((item, idx) => `
      <button class="dropdown-item ${idx === 0 ? 'active' : ''}" type="button" data-value="${escapeHtml(item.value)}">
        ${item.image
          ? `<span class="drop-media">
              <img class="drop-avatar" src="${escapeHtml(item.image)}" alt="" loading="lazy" onerror="this.style.display='none'; const fb=this.nextElementSibling; if (fb) fb.style.display='inline-flex';">
              <span class="drop-emoji drop-emoji-fallback">${escapeHtml(item.emoji)}</span>
            </span>`
          : `<span class="drop-emoji">${escapeHtml(item.emoji)}</span>`}
        <span class="drop-main">
          <span class="drop-title">${item.flag ? `<span class="drop-title-flag">${escapeHtml(item.flag)}</span>` : ''}${escapeHtml(item.label)}</span>
          <span class="drop-sub">${escapeHtml(item.sub || '')}</span>
        </span>
        ${item.flag
          ? `<span class="drop-pill drop-pill-flag" title="${escapeHtml(item.countryCode || '')}">${escapeHtml(item.flag)}</span>`
          : (item.pill ? `<span class="drop-pill">${escapeHtml(item.pill)}</span>` : '<span></span>')}
      </button>
    `).join('')}
  `;
  panelEl.querySelectorAll('.dropdown-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.getAttribute('data-value') || '';
      if (multi) appendCsvValue(inputEl, value);
      else {
        inputEl.value = value;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
      closeAllDropdowns();
      inputEl.focus();
    });
  });
}

function openDropdown(kind) {
  closeAllDropdowns();
  const map = {
    categories: { input: el.categoriesInput, panel: el.categoriesDropdown, multi: true, dataKind: 'categories' },
    tournaments: { input: el.tournamentsInput, panel: el.tournamentsDropdown, multi: true, dataKind: 'tournaments' },
    players: { input: el.playersInput, panel: el.playersDropdown, multi: true, dataKind: 'players' },
    trackedPlayer: { input: el.trackedPlayerInput, panel: el.trackedPlayerDropdown, multi: false, dataKind: 'players' },
    rivalPlayer: { input: el.paramRivalPlayerInput, panel: el.paramRivalPlayerDropdown, multi: false, dataKind: 'players' },
  };
  const cfg = map[kind];
  if (!cfg) return;
  renderDropdown(cfg.dataKind, cfg.input, cfg.panel, cfg.multi);
  cfg.panel.classList.add('open');
  state.openDropdown = kind;
}

function closeAllDropdowns() {
  [
    el.categoriesDropdown, el.tournamentsDropdown, el.playersDropdown,
    el.trackedPlayerDropdown, el.paramRivalPlayerDropdown,
  ].forEach((panel) => panel && panel.classList.remove('open'));
  state.openDropdown = null;
}

const debouncedSuggestRefresh = debounce(async (kind) => {
  const map = {
    categories: el.categoriesInput,
    tournaments: el.tournamentsInput,
    players: el.playersInput,
    trackedPlayer: el.trackedPlayerInput,
    rivalPlayer: el.paramRivalPlayerInput,
  };
  const inputEl = map[kind];
  if (!inputEl) return;
  const query = kind === 'categories'
    ? getTokenForInput(inputEl)
    : (kind === 'trackedPlayer' || kind === 'rivalPlayer' ? inputEl.value.trim() : getTokenForInput(inputEl));
  if (query.length >= 2) await loadOptions(query);
  openDropdown(kind);
}, 260);

async function saveSettings() {
  try {
    await api('/api/settings', {
      method: 'POST',
      body: JSON.stringify({
        email: el.emailInput.value.trim(),
        enabled: el.enabledInput.checked,
      }),
    });
    setMessage(el.settingsMessage, 'Settings saved.');
    await loadState();
  } catch (error) {
    setMessage(el.settingsMessage, error.message, true);
  }
}

async function saveRule(event) {
  event.preventDefault();
  const payload = getRuleFormPayload();
  const requiredStatus = getRuleBuilderRequiredStatus();
  const missingRequired = [
    ...requiredStatus.coreMissing,
    ...requiredStatus.focusMissing,
    ...requiredStatus.deliveryMissing,
  ];
  if (missingRequired.length) {
    updateGuidedFlowUi();
    setMessage(el.ruleMessage, `Please complete required fields: ${summarizeMissing(missingRequired)}.`, true);
    return;
  }
  if ((payload.conditions || []).length > 3) {
    setMessage(el.ruleMessage, 'Max 3 extra filters per rule.', true);
    return;
  }

  try {
    const isEdit = !!payload.id;
    const path = isEdit ? `/api/rules/${encodeURIComponent(payload.id)}` : '/api/rules';
    await api(path, {
      method: isEdit ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    });
    setMessage(el.ruleMessage, isEdit ? 'Rule updated.' : 'Rule created.');
    resetRuleForm();
    await loadState();
  } catch (error) {
    setMessage(el.ruleMessage, error.message, true);
  }
}

async function runNow() {
  try {
    const payload = await api('/api/run-now', { method: 'POST' });
    const data = payload.data || {};
    setMessage(el.settingsMessage, `${data.message} Sent: ${data.sent}, matched: ${data.matched}`);
    await loadState();
  } catch (error) {
    setMessage(el.settingsMessage, error.message, true);
  }
}

async function sendTestEmail() {
  try {
    const payload = await api('/api/test-email', {
      method: 'POST',
      body: JSON.stringify({ email: el.emailInput.value.trim() }),
    });
    setMessage(el.settingsMessage, payload.message || 'Test email sent.');
    await loadState();
  } catch (error) {
    setMessage(el.settingsMessage, error.message, true);
  }
}

async function clearHistory() {
  try {
    await api('/api/history/clear', { method: 'POST' });
    await loadState();
  } catch (error) {
    setMessage(el.settingsMessage, error.message, true);
  }
}

function bindQuickChips() {
  document.querySelectorAll('.quick-chip').forEach((chipBtn) => {
    chipBtn.addEventListener('click', () => {
      const target = document.getElementById(chipBtn.dataset.target);
      if (!target) return;
      appendCsvValue(target, chipBtn.dataset.value);
      target.focus();
    });
  });
}

function bindDropdown(inputEl, kind, buttonEl) {
  inputEl.addEventListener('focus', () => openDropdown(kind));
  inputEl.addEventListener('input', () => debouncedSuggestRefresh(kind));
  buttonEl.addEventListener('click', async () => {
    if (state.openDropdown === kind) {
      closeAllDropdowns();
      return;
    }
    const query = kind === 'trackedPlayer' || kind === 'rivalPlayer'
      ? inputEl.value.trim()
      : getTokenForInput(inputEl);
    if (query.length >= 2) await loadOptions(query);
    openDropdown(kind);
  });
}

function bindEvents() {
  el.saveSettingsBtn.addEventListener('click', saveSettings);
  el.runNowBtn.addEventListener('click', runNow);
  el.testEmailBtn.addEventListener('click', sendTestEmail);
  el.ruleForm.addEventListener('submit', saveRule);
  el.resetFormBtn.addEventListener('click', resetRuleForm);
  el.clearHistoryBtn.addEventListener('click', clearHistory);

  el.eventTypeInput.addEventListener('change', updateEventUi);
  el.roundModeInput.addEventListener('change', updateRoundUi);
  el.quietHoursEnabledInput.addEventListener('change', updateQuietHoursUi);
  el.tourInput.addEventListener('change', async () => {
    await loadOptions('');
    refreshConditionOptionSources();
    closeAllDropdowns();
    updateGuidedFlowUi();
  });

  const guidedInputWatch = [
    el.ruleNameInput,
    el.roundValueInput,
    el.playersInput,
    el.trackedPlayerInput,
    el.paramRivalPlayerInput,
    el.cooldownInput,
    el.paramTitleTarget,
  ];
  guidedInputWatch.forEach((node) => node && node.addEventListener('input', updateGuidedFlowUi));

  const guidedChangeWatch = [
    el.conditionGroupInput,
    el.ruleEnabledInput,
    el.paramSetNumber,
    el.paramUpsetGap,
    el.paramDecidingMode,
    el.paramRankingMilestone,
    el.paramH2HLosses,
    el.paramSurfaceValue,
    el.paramWindowHours,
    el.paramStageQF,
    el.paramStageSF,
    el.paramStageF,
    el.channelEmail,
    el.channelTelegram,
    el.channelDiscord,
    el.channelWebPush,
    el.severityInput,
  ];
  guidedChangeWatch.forEach((node) => node && node.addEventListener('change', updateGuidedFlowUi));

  el.addConditionBtn.addEventListener('click', () => {
    const count = el.conditionsList.querySelectorAll('.condition-row').length;
    if (count >= 3) return;
    el.conditionsList.appendChild(createConditionRow());
    refreshConditionButtonState();
  });

  bindDropdown(el.categoriesInput, 'categories', el.categoriesDropdownBtn);
  bindDropdown(el.tournamentsInput, 'tournaments', el.tournamentsDropdownBtn);
  bindDropdown(el.playersInput, 'players', el.playersDropdownBtn);
  bindDropdown(el.trackedPlayerInput, 'trackedPlayer', el.trackedPlayerDropdownBtn);
  bindDropdown(el.paramRivalPlayerInput, 'rivalPlayer', el.paramRivalPlayerDropdownBtn);

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.smart-input-wrap')) closeAllDropdowns();
  });

  bindQuickChips();
}

(async function init() {
  bindEvents();
  resetRuleForm();
  await Promise.all([loadState(), loadOptions('')]);
})();
