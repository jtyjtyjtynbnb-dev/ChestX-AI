// Run on the Vite app with agent-browser eval --stdin. Uses UI events only.
(async () => {
  const checks = [];
  const q = selector => document.querySelector(selector);
  const all = selector => [...document.querySelectorAll(selector)];
  const assert = (condition, message) => { if (!condition) throw new Error(message); checks.push(message); };
  const wait = async predicate => {
    const until = Date.now() + 5000;
    while (!predicate()) {
      if (Date.now() > until) throw new Error('Timed out: ' + predicate.toString());
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    await new Promise(resolve => requestAnimationFrame(resolve));
  };
  const click = async selector => { const el = q(selector); if (!el) throw new Error('Missing ' + selector); el.click(); await Promise.resolve(); };
  const fill = async (selector, value) => { const el=q(selector); el.value=value; el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', {bubbles:true})); await Promise.resolve(); };
  const navigate = async name => {
    const old = q('.page-view');
    const changed = location.pathname !== '/' + name;
    await click(`header [data-nav="${name}"]`);
    await wait(() => q('#page-' + name));
    assert(all('.page-view').length === 1, name + ': exactly one mounted page');
    if (changed) assert(!old.isConnected, name + ': previous page DOM removed');
    assert(q(`header [data-nav="${name}"]`).classList.contains('font-semibold'), name + ': navigation highlight');
  };

  for (const name of ['home','interpret','records','knowledge','academy','about']) await navigate(name);
  history.back(); await wait(() => q('#page-academy'));
  assert(q('header [data-nav="academy"]').classList.contains('font-semibold'), 'browser back synchronizes highlight');
  history.forward(); await wait(() => q('#page-about'));
  assert(q('#aboutModelEchart canvas'), 'about page initializes its own chart');
  await navigate('knowledge');
  await fill('#knowledgeSearchInput','');
  assert(all('[data-disease-code]').length === 10, 'knowledge: all ten diseases');
  await fill('#knowledgeSearchInput','Pulmonary Nodule');
  assert(all('[data-disease-code]').length === 1, 'knowledge: search filters list');
  await fill('#knowledgeSearchInput','');
  await click('[data-disease-code="nodule"]');
  assert(q('#knowledgeImageHeading').textContent.includes('结节'), 'knowledge: disease detail switches');
  const note = q('#knowledgeImageNote').textContent;
  await click('#knowledgeHotspots [data-hotspot-index="1"]');
  assert(q('#knowledgeImageNote').textContent !== note, 'knowledge: image hotspot changes note');
  await click('#knowledgeToAcademySignsBtn'); await wait(() => q('#page-academy'));
  assert(!q('#academy-tab-signs').classList.contains('hidden'), 'knowledge links to academy signs tab');
  assert(all('[data-sign-card]').length === 10, 'academy: ten sign cards');
  await click('[data-academy-tab="basics"]');
  assert(all('#anatomyHotspotsLayer [data-spot-id]').length === 8, 'academy: eight anatomy points');
  await click('[data-quick-spot="1"]');
  assert(q('[data-quick-spot="1"]').classList.contains('font-medium'), 'academy: anatomy selection works');
  await click('[data-academy-tab="guide"]');
  assert(q('#nineStepGuideGrid').children.length === 9, 'academy: nine reading steps');
  await click('[data-quiz-id="q1"][data-opt-idx="1"]');
  await click('[data-quiz-id="q2"][data-opt-idx="0"]');
  await click('[data-quiz-id="q3"][data-opt-idx="2"]');
  assert(q('#quizScoreBadge').textContent.includes('3 / 3'), 'academy: quiz answers and score');
  await navigate('home'); await navigate('academy');
  assert(q('#quizScoreBadge').textContent.includes('3 / 3'), 'academy: quiz state survives remount');
  await navigate('knowledge');
  assert(q('#knowledgeImageHeading').textContent.includes('结节'), 'knowledge: selected disease survives remount');

  await navigate('interpret');
  const previousZoom = q('#zoomPercentBadge').textContent;
  await click('#zoomInBtn');
  assert(q('#zoomPercentBadge').textContent !== previousZoom, 'interpret: zoom works');
  await click('#resetViewerBtn');
  await click('#probViewChartBtn');
  await wait(() => q('#probEchartContainer canvas'));
  assert(q('#probEchartContainer canvas'), 'interpret: probability chart initializes');
  await navigate('home'); await navigate('interpret');
  await wait(() => q('#probEchartContainer canvas'));
  assert(q('#probEchartContainer canvas'), 'interpret: probability chart recreates after unmount');

  await navigate('records');
  await click('#resetRecordFilterBtn');
  const count = all('[data-detail-id]').length;
  assert(count > 0, 'records: existing records render');
  await fill('#filterKeyword','__no_such_record__');
  assert(all('[data-detail-id]').length === 0 && !q('#recordsEmptyState').classList.contains('hidden'), 'records: filters and empty state');
  await click('#resetRecordFilterBtn');
  await click('[data-detail-id]');
  assert(!q('#detailModalBackdrop').classList.contains('hidden') && q('#modalRecordBody').textContent.length > 50, 'records: global detail modal');
  await click('#closeDetailModalBtn');
  await click('[data-reload-id]'); await wait(() => q('#page-interpret'));
  assert(!q('#stateDonePanel').classList.contains('hidden'), 'records: reload initializes interpret page');
  await click('#openSettingsBtn');
  assert(!q('#userModalBackdrop').classList.contains('hidden') && q('#userNameInput').value.length > 0, 'global: family/settings available');
  await click('#settingsStatsBtn');
  assert(!q('#statsModalBackdrop').classList.contains('hidden'), 'global: statistics available');
  await click('#closeStatsModalBtn');
  await navigate('home');
  await click('#aiChatLauncher');
  assert(q('#aiChatPanel').style.display === 'flex', 'global: chat launcher opens once');
  await navigate('knowledge');
  assert(q('#aiChatPanel').style.display === 'flex', 'global: chat shell survives route change');
  await click('#aiChatCloseBtn');
  assert(q('#aiChatPanel').style.display === 'none', 'global: chat closes');
  return {passed: checks.length, checks};
})();

