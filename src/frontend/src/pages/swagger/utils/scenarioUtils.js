import {SCENARIO_STEP_MATCHERS, SCENARIO_STEPS} from '../constants/scenarioConstants.js';

export const matchScenarioStepResult = (item, matchers) => {
    if (!item || !matchers?.length) return false;
    const id = String(item.id || '');
    if (!id) return false;

    return matchers.some((matcher) => {
        if (!matcher) return false;
        if (typeof matcher === 'function') return Boolean(matcher(item));
        const raw = String(matcher);
        if (raw.endsWith('*')) {
            return id.startsWith(raw.slice(0, -1));
        }
        return id === raw;
    });
};

export const buildScenarioStepSummary = (items) => {
    const summary = {total: items.length, success: 0, failed: 0, skipped: 0};

    items.forEach((item) => {
        if (item.status === 'success') summary.success += 1;
        else if (item.status === 'failed') summary.failed += 1;
        else if (item.status === 'skipped') summary.skipped += 1;
    });

    return summary;
};
