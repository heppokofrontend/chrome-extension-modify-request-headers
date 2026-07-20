import { applyEditMode } from '@/contexts/popup/components/form';
import { CLASS_NAMES } from '@/contexts/popup/constants';
import type { HeaderRule } from '@/types';
import { getMessage } from '@/utils';

const buildRuleRow = (rule: HeaderRule) => {
  const tr = document.createElement('tr');

  tr.dataset['active'] = String(rule.isActive);

  const th = document.createElement('th');
  const button = document.createElement('button');
  const typeCell = document.createElement('td');
  const valueCell = document.createElement('td');

  th.scope = 'row';

  const statusIcon = document.createElement('span');

  statusIcon.setAttribute('aria-hidden', 'true');
  statusIcon.textContent = rule.isActive ? '✅' : '❌';

  const statusText = getMessage(rule.isActive ? 'rule_table_active' : 'rule_table_inactive');

  button.type = 'button';
  button.className = CLASS_NAMES.ruleEditButton;
  button.dataset['id'] = rule.id;
  button.setAttribute(
    'aria-label',
    getMessage('rule_table_edit', `${rule.headerName}${statusText}`),
  );
  button.append(statusIcon, ` ${rule.headerName}`);
  button.addEventListener('click', () => {
    applyEditMode.start(rule);
  });
  th.append(button);

  typeCell.textContent = rule.operation;

  if (rule.operation === 'remove') {
    valueCell.textContent = '-';
    valueCell.className = 'of-remove';
  } else {
    valueCell.textContent = rule.value;
  }

  tr.append(th, typeCell, valueCell);

  return tr;
};

export const buildTable = (rules: HeaderRule[]) => {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  const tbody = document.createElement('tbody');

  for (const label of ['Header name', 'Type', 'Value']) {
    const th = document.createElement('th');

    th.textContent = label;
    th.scope = 'col';
    headRow.append(th);
  }

  thead.append(headRow);

  for (const rule of rules) {
    tbody.append(buildRuleRow(rule));
  }

  table.className = 'rule__table';
  table.append(thead, tbody);

  return table;
};
