/**
 * == מול ===
 * ---------
 * ==  (שוויון רופף): עושה המרות טיפוסים לפני ההשוואה.
 * === (שוויון קשיח): בלי המרות, חייב גם אותו ערך וגם אותו טיפוס.
 *
 * בדמו הזה אנחנו בונים “שאלות מבלבלות” ומחשבים לכל שורה:
 *   x == y
 *   x === y
 */

const rowsTbody = document.getElementById('rows');
const summaryEl = document.getElementById('summary');

const onlyDifferentEl = document.getElementById('onlyDifferent');
const onlyTrueEl = document.getElementById('onlyTrue');
const onlyFalseEl = document.getElementById('onlyFalse');

const shuffleBtn = document.getElementById('shuffleBtn');
const resetBtn = document.getElementById('resetBtn');

const quizModeEl = document.getElementById('quizMode');
const checkBtn = document.getElementById('checkBtn');
const revealBtn = document.getElementById('revealBtn');
const clearAnswersBtn = document.getElementById('clearAnswersBtn');

let answers = new Map();
let revealed = false;
let quizChecked = false;

function typeOf(value) {
	if (value === null) return 'null';
	if (Number.isNaN(value)) return 'NaN';
	if (Object.is(value, -0)) return '-0';
	return typeof value;
}

function repr(value) {
	// מייצג ערכים בצורה קריאה בטבלה
	if (value === undefined) return 'undefined';
	if (value === null) return 'null';
	if (typeof value === 'string') return JSON.stringify(value);
	if (typeof value === 'number') {
		if (Number.isNaN(value)) return 'NaN';
		if (Object.is(value, -0)) return '-0';
		return String(value);
	}
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	if (typeof value === 'bigint') return `${value}n`;
	if (typeof value === 'symbol') return value.toString();
	if (typeof value === 'function') return 'function() {…}';
	if (value instanceof String) return `new String(${JSON.stringify(value.valueOf())})`;
	if (value instanceof Number) return `new Number(${String(value.valueOf())})`;
	if (value instanceof Boolean) return `new Boolean(${value.valueOf() ? 'true' : 'false'})`;
	if (value instanceof Date) return `new Date(${JSON.stringify(value.toISOString())})`;
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

function safeLooseEqual(x, y) {
	// מגן מפני TypeError במקרים כמו: 1n == 1 (BigInt מול Number)
	try {
		return x == y; // eslint-disable-line eqeqeq
	} catch {
		return 'throws';
	}
}

function safeStrictEqual(x, y) {
	try {
		return x === y;
	} catch {
		return 'throws';
	}
}

function makeCase(x, y, hint) {
	return { x, y, hint };
}

function makeCaseSteps(x, y, steps) {
	// steps: { loose: string, strict: string }
	return { x, y, steps };
}

function typeLabel(v) {
	if (v === null) return 'null';
	if (Number.isNaN(v)) return 'NaN';
	if (Object.is(v, -0)) return 'number(-0)';
	if (typeof v === 'number') return 'number';
	if (typeof v === 'string') return 'string';
	if (typeof v === 'boolean') return 'boolean';
	if (typeof v === 'bigint') return 'bigint';
	if (typeof v === 'undefined') return 'undefined';
	if (typeof v === 'symbol') return 'symbol';
	if (typeof v === 'function') return 'function';
	return 'object';
}

function defaultSteps(x, y) {
	const tx = typeLabel(x);
	const ty = typeLabel(y);
	// לא מנסים לשחזר את כל האלגוריתם של spec אוטומטית — זה רק “הכוונה”.
	return {
		loose: `(${tx}) == (${ty}) → JavaScript עושה coercion (המרות) לפי הכללים, ואז משווה`,
		strict: `(${tx}) === (${ty}) → אין המרות; אם הטיפוסים שונים ⇒ false, אחרת השוואת ערך/זהות`,
	};
}

// הרבה דוגמאות “מבלבלות” + כאלה שמופיעות בטבלאות ידועות (כמו בצילום שלך)
let cases = [
	// null / undefined
	makeCaseSteps(undefined, undefined, {
		loose: 'undefined == undefined → אותו פרימיטיב ⇒ true',
		strict: 'undefined === undefined → אותו טיפוס ואותו ערך ⇒ true',
	}),
	makeCaseSteps(null, null, {
		loose: 'null == null → אותו פרימיטיב ⇒ true',
		strict: 'null === null → אותו טיפוס ואותו ערך ⇒ true',
	}),
	makeCaseSteps(null, undefined, {
		loose: 'null == undefined → כלל מיוחד ב-==: null שווה רק ל-undefined ⇒ true',
		strict: 'null === undefined → טיפוסים שונים (null vs undefined) ⇒ false',
	}),
	makeCase(undefined, 0, 'undefined כמעט אף פעם לא “מומר” ל-0'),
	makeCase(null, 0, 'null מומר ל-0 ב-== רק מול מספרים'),

	// booleans מול numbers/strings
	makeCase(false, 0, 'false מומר ל-0 ב-=='),
	makeCase(true, 1, 'true מומר ל-1 ב-=='),
	makeCase(true, 2, 'true הוא 1, לא 2'),
	makeCase(false, '0', 'false -> 0, ואז "0" -> 0'),
	makeCase(false, '', 'false -> 0, "" -> 0'),
	makeCase(true, '1', 'true -> 1, ואז "1" -> 1'),

	// strings מול numbers
	makeCase('', 0, '"" מומר ל-0 ב-=='),
	makeCase(' ', 0, 'רווחים עוברים ToNumber => 0'),
	makeCase('\n\t', 0, 'תווי whitespace גם נהיים 0'),
	makeCase('0', 0, '"0" -> 0 ב-=='),
	makeCase('00', 0, 'גם "00" -> 0'),
	makeCase('0', false, '"0" -> 0 ו-false -> 0'),
	makeCase('1', true, '"1" -> 1 ו-true -> 1'),
	makeCase('2', true, '"2" -> 2 אבל true הוא 1'),
	makeCase('0.0', 0, 'מחרוזת מספרית מומרת למספר'),
	makeCase('0x10', 16, 'hex string => 16'),
	makeCase('1e2', 100, 'מדעית => 100'),
	makeCase('Infinity', Infinity, 'גם Infinity כמחרוזת'),
	makeCase('NaN', NaN, '"NaN" -> NaN, אבל NaN לא שווה לעצמו'),

	// NaN ו-0/-0
	makeCase(NaN, NaN, 'NaN אף פעם לא שווה (גם לא ב-===)'),
	makeCase(0, -0, 'ב-== וב-=== זה true (אבל Object.is שונה)'),
	makeCase(-0, 0, 'אותו דבר כמו מעל'),

	// arrays/objects
	makeCaseSteps([], [], {
		loose: '[] == [] → שני אובייקטים שונים בזיכרון ⇒ false (אין coercion שמאחד אותם)',
		strict: '[] === [] → גם כאן: אובייקטים שונים ⇒ false',
	}),
	makeCaseSteps([], 0, {
		loose: '[] == 0 → ToPrimitive([]) => "" → ToNumber("") => 0 → 0 == 0 ⇒ true',
		strict: '[] === 0 → טיפוסים שונים (object vs number) ⇒ false',
	}),
	makeCaseSteps([0], 0, {
		loose: '[0] == 0 → ToPrimitive([0]) => "0" → ToNumber("0") => 0 → 0 == 0 ⇒ true',
		strict: '[0] === 0 → object vs number ⇒ false',
	}),
	makeCaseSteps([1], 1, {
		loose: '[1] == 1 → ToPrimitive([1]) => "1" → ToNumber("1") => 1 → 1 == 1 ⇒ true',
		strict: '[1] === 1 → object vs number ⇒ false',
	}),
	makeCaseSteps([1, 2], '1,2', {
		loose: '[1,2] == "1,2" → ToPrimitive([1,2]) => "1,2" → "1,2" == "1,2" ⇒ true',
		strict: '[1,2] === "1,2" → object vs string ⇒ false',
	}),
	makeCase([1, 2], '1, 2', 'שימו לב לרווח במחרוזת'),
	makeCase([1, 2], [1, 2], 'אותו תוכן, אבל אובייקטים שונים => false'),
	makeCaseSteps({}, '[object Object]', {
		loose: '{} == "[object Object]" → ToPrimitive({}) => "[object Object]" → השוואת מחרוזות ⇒ true',
		strict: '{} === "[object Object]" → object vs string ⇒ false',
	}),
	makeCase({}, {}, 'אובייקטים שונים => false'),
	makeCase({ valueOf: () => 1 }, 1, 'valueOf יכול להשפיע על coercion'),
	makeCase({ toString: () => '0' }, 0, 'toString יכול להשפיע על coercion'),
	makeCase({ valueOf: () => ({}) }, '[object Object]', 'fallback ל-toString'),

	// wrappers
	makeCase(new String('foo'), 'foo', 'אובייקט מול פרימיטיב'),
	makeCase(new Number(0), 0, 'new Number(0) == 0 => true'),
	makeCase(new Boolean(false), false, 'מבלבל: האובייקט truthy, אבל == עושה valueOf'),
	makeCase(new Boolean(false), true, 'false לא נהיה true'),

	// functions
	makeCase(function f() {}, function g() {}, 'פונקציות שונות => false'),

	// BigInt (מקרים שזורקים)
	makeCaseSteps(1n, 1, {
		loose: '1n == 1 → השוואת BigInt מול Number ב-==: כש-1 הוא מספר שלם “תואם”, ההשוואה יכולה לצאת true',
		strict: '1n === 1 → bigint vs number ⇒ false',
	}),
	makeCaseSteps(0n, 0, {
		loose: '0n == 0 → אותו רעיון כמו מעל ⇒ true',
		strict: '0n === 0 → bigint vs number ⇒ false',
	}),
	makeCaseSteps(1n, '1', {
		loose: '1n == "1" → "1" מומר ל-Number 1 → 1n == 1 ⇒ true',
		strict: '1n === "1" → bigint vs string ⇒ false',
	}),
	makeCaseSteps(10n, '10.0', {
		loose: '10n == "10.0" → "10.0" מומר למספר 10 (Number), אבל BigInt מול Number “לא תמיד תואם” ⇒ כאן יוצא false',
		strict: '10n === "10.0" → bigint vs string ⇒ false',
	}),

	// edge-y primitives
	makeCase('', false, '"" -> 0, false -> 0'),
	makeCase(' \n', false, 'whitespace -> 0'),
	makeCase('\t', 0, 'tab -> 0'),
	makeCase('\r\n', 0, 'CRLF -> 0'),
];

// מאפשר בדיקות אוטומטיות (Node) בלי דפדפן
globalThis.cases = cases;

function shuffleInPlace(arr) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
}

function badge(value, extraClass = '') {
	if (value === 'throws') {
		return `<span class="badge false ${extraClass}">throws</span>`;
	}
	if (value === true) return `<span class="badge true ${extraClass}">true</span>`;
	return `<span class="badge false ${extraClass}">false</span>`;
}

function normalizeTF(v) {
	if (v === 'T') return true;
	if (v === 'F') return false;
	return null;
}

function quizClassOn(on) {
	document.body.classList.toggle('quizModeOn', on);
}

function quizCheckedClassOn(on) {
	document.body.classList.toggle('quizChecked', on);
}

function render() {
	if (!rowsTbody || !summaryEl) return;
	const quizMode = !!quizModeEl?.checked;
	quizClassOn(quizMode && !revealed);
	quizCheckedClassOn(quizMode && !revealed && quizChecked);

	const onlyDifferent = !!onlyDifferentEl?.checked;
	const onlyTrue = !!onlyTrueEl?.checked;
	const onlyFalse = !!onlyFalseEl?.checked;

	let visible = cases
		.map((c, idx) => {
			const loose = safeLooseEqual(c.x, c.y);
			const strict = safeStrictEqual(c.x, c.y);
			const different = loose !== strict;
			return {
				idx,
				...c,
				loose,
				strict,
				different,
			};
		})
		.filter((c) => {
			if (onlyDifferent && !c.different) return false;
			if (onlyTrue && c.loose !== true) return false;
			if (onlyFalse && c.loose !== false) return false;
			return true;
		});

	rowsTbody.innerHTML = visible
		.map((c, i) => {
			const diffBadge = c.different ? ' <span class="badge diff">diff</span>' : '';
			const key = `${c.idx}`;
			const prev = answers.get(key) ?? { loose: '', strict: '' };
			const mark = prev.mark;
			const answered = prev.answered === true;
			const markHtml =
				mark === 'ok'
					? '<div class="mark ok">נכון</div>'
					: mark === 'bad'
						? '<div class="mark bad">לא נכון</div>'
						: '';

			const answerInputs = `
				<div class="answerGroup" data-key="${key}">
					<div class="tf">
						<div class="tfLabel"><code>==</code></div>
						<select class="tfSelect" data-op="loose" aria-label="ניחוש עבור x == y">
							<option value="" ${prev.loose === '' ? 'selected' : ''}>?</option>
							<option value="T" ${prev.loose === 'T' ? 'selected' : ''}>T</option>
							<option value="F" ${prev.loose === 'F' ? 'selected' : ''}>F</option>
						</select>
					</div>
					<div class="tf">
						<div class="tfLabel"><code>===</code></div>
						<select class="tfSelect" data-op="strict" aria-label="ניחוש עבור x === y">
							<option value="" ${prev.strict === '' ? 'selected' : ''}>?</option>
							<option value="T" ${prev.strict === 'T' ? 'selected' : ''}>T</option>
							<option value="F" ${prev.strict === 'F' ? 'selected' : ''}>F</option>
						</select>
					</div>
				</div>
				${markHtml}
			`;

			return `
				<tr>
					<td class="mono">${i + 1}</td>
					<td>
						<div class="mono">${repr(c.x)}</div>
						<div class="hint hint-type ${answered && quizChecked ? 'showType' : ''}">type: ${typeOf(c.x)}</div>
					</td>
					<td>
						<div class="mono">${repr(c.y)}</div>
						<div class="hint hint-type ${answered && quizChecked ? 'showType' : ''}">type: ${typeOf(c.y)}</div>
					</td>
					<td class="col-ans">${answerInputs}</td>
					<td class="col-res">${badge(c.loose)}${diffBadge}</td>
					<td class="col-res">${badge(c.strict)}</td>
					<td class="hint col-hint ${answered && quizChecked ? 'showHint' : ''}">${(() => {
						if (!(answered && quizChecked)) return '';
						const s = c.steps ?? defaultSteps(c.x, c.y);
						const extra = c.hint ? `<div style="margin-top:6px;">${c.hint}</div>` : '';
						return `
							<div class="mono" style="font-weight:800;">== (הרצה אחורית)</div>
							<div>${s.loose}</div>
							<div class="mono" style="font-weight:800; margin-top:8px;">=== (הרצה אחורית)</div>
							<div>${s.strict}</div>
							${extra}
						`;
					})()}</td>
				</tr>
			`;
		})
		.join('');

	const total = cases.length;
	const shown = visible.length;
	const diffs = visible.filter((c) => c.different).length;
	const modeText = quizMode && !revealed ? 'מצב חידון פעיל (התשובות מוסתרות).' : 'מצב צפייה (התשובות גלויות).';
	summaryEl.textContent = `מוצגות ${shown} מתוך ${total} שאלות. בתוך המוצגות: ${diffs} שורות שבהן == ו-=== שונים. ${modeText}`;

	// מאזינים לשדות תשובה (אחרי רינדור)
	rowsTbody.querySelectorAll('.answerGroup').forEach((group) => {
		const key = group.getAttribute('data-key');
		group.querySelectorAll('select.tfSelect').forEach((sel) => {
			sel.addEventListener('change', () => {
				const op = sel.getAttribute('data-op');
				const value = sel.value;
				const prev = answers.get(key) ?? { loose: '', strict: '' };
				const next = { ...prev, [op]: value, mark: undefined };
				// נחשב “answered” רק אם יש תשובה לשני האופרטורים
				next.answered = !!(next.loose && next.strict);
				answers.set(key, next);
				quizChecked = false;
			});
		});
	});
}

function resetFilters() {
	if (onlyDifferentEl) onlyDifferentEl.checked = false;
	if (onlyTrueEl) onlyTrueEl.checked = false;
	if (onlyFalseEl) onlyFalseEl.checked = false;
	revealed = false;
	quizChecked = false;
	render();
}

function checkAnswers() {
	// בודק רק מול הרשימה המקורית (לפי idx)
	let answered = 0;
	let correct = 0;

	for (const [key, a] of answers.entries()) {
		const c = cases[Number(key)];
		if (!c) continue;
		const looseRes = safeLooseEqual(c.x, c.y);
		const strictRes = safeStrictEqual(c.x, c.y);
		// אם throws, לא בודקים פה (זה נושא מתקדם; העדפתי לא להכשיל)
		if (looseRes === 'throws' || strictRes === 'throws') continue;

		const guessLoose = normalizeTF(a.loose);
		const guessStrict = normalizeTF(a.strict);
		if (guessLoose === null || guessStrict === null) continue;
		answered++;
		const ok = guessLoose === looseRes && guessStrict === strictRes;
		if (ok) correct++;
		answers.set(key, { ...a, mark: ok ? 'ok' : 'bad', answered: true });
	}

	// נשאיר את התשובות מוסתרות — רק מסמן נכון/לא נכון
	quizChecked = true;
	render();
	summaryEl.textContent = `נבדקו ${answered} תשובות מלאות. ציון: ${correct}/${answered}. (שורות עם throws לא נספרות)`;
}

function revealAnswers() {
	revealed = true;
	quizChecked = false;
	render();
}

function clearAnswers() {
	answers = new Map();
	revealed = false;
	quizChecked = false;
	render();
}

shuffleBtn?.addEventListener('click', () => {
	shuffleInPlace(cases);
	render();
});

resetBtn?.addEventListener('click', resetFilters);

quizModeEl?.addEventListener('change', () => {
	// אם חוזרים למצב חידון — מסתירים שוב
	if (quizModeEl.checked) {
		revealed = false;
		quizChecked = false;
	}
	render();
});

checkBtn?.addEventListener('click', checkAnswers);
revealBtn?.addEventListener('click', revealAnswers);
clearAnswersBtn?.addEventListener('click', clearAnswers);

[onlyDifferentEl, onlyTrueEl, onlyFalseEl].forEach((el) => {
	el?.addEventListener('change', render);
});

render();
