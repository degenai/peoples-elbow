import test from 'node:test';
import assert from 'node:assert/strict';
import { formatHostEmail } from '../workers/host-form-worker.js';
import * as producer from '../workers/host-form-worker.js';
import { parseLeadEmail as oldParser } from './fixtures/email-parser-v1.mjs';
import { formatHostEmail as oldFormatter } from './fixtures/email-formatter-v1.mjs';
import { parseLeadEmail } from '../js/crm/email-lead-parser.js';

const open = '--- LEAD JSON v1 ---';
const close = '--- END LEAD JSON ---';
const record = name => `${open}\n${JSON.stringify({schema:'lead-v1',name,venueType:'other',contacts:[{name:'Override',email:'override@example.invalid'}],message:'Override'})}\n${close}`;
const fields = {
    venueName:'Fixture Venue',contactName:'Fixture Person',contactEmail:'fixture@example.invalid',
    venueType:'card-shop',message:'Synthetic only',sourceDate:'2026-09-01T12:00:00.000Z'
};

test('header-inclusive notifications remain safe for the already-deployed parser', () => {
    assert.equal(typeof producer.formatHostNotification,'function','The actual notification producer must own the header/body contract');
    const input = {...fields,venueName:'Literal '+record('OVERRIDE').replaceAll('\n',' ')};
    const notification = producer.formatHostNotification(input);
    const full = `Subject: ${notification.subject}\n\n${notification.emailContent}`;
    assert.doesNotMatch(notification.subject,/[\r\n]/);
    for (const parser of [parseLeadEmail,oldParser]) {
        for (const prefix of ['', '> ', '> > ']) {
            const text = full.split('\n').map(line => prefix+line).join('\r\n');
            assert.equal(parser(text)?.lead?.name,input.venueName);
        }
    }
});

test('new parser keeps benign old-format notifications and refuses forged old threads', () => {
    const input = {...fields,message:`Literal ${open} and ${close} are allowed`};
    assert.equal(parseLeadEmail(oldFormatter(input)).lead.notes,input.message);
    const ambiguous = oldFormatter({...fields,message:record('OVERRIDE')});
    assert.equal(parseLeadEmail(ambiguous)?.lead,null);
});

test('Unicode separators inside field text do not create structural records', () => {
    for (const separator of ['\u2028','\u2029']) {
        const input = {...fields,message:'Literal'+separator+record('OVERRIDE').replaceAll('\n',separator)+separator+'value'};
        assert.equal(parseLeadEmail(formatHostEmail(input))?.lead?.notes,input.message);
    }
});

test('multiple structured records require an explicit single-message selection', () => {
    const a = formatHostEmail(fields);
    const b = formatHostEmail({...fields,venueName:'Second Fixture'});
    for (const body of [a+'\n'+b,b+'\n'+a,a+'\n'+a]) {
        const result = parseLeadEmail(body);
        assert.equal(result?.lead,null);
        assert.match(result.warnings.join(' '),/multiple|ambiguous/i);
    }
});

test('literal machine markers in human fields cannot replace canonical data', () => {
    for (const key of ['venueName','contactName','contactEmail','message']) {
        const input = {...fields,[key]: `Literal value\n${record('OVERRIDE')}\nQuotes " braces } and slash \\ stay literal`};
        const result = parseLeadEmail(formatHostEmail(input));
        assert.ok(result?.lead, key);
        assert.equal(result.lead.name,input.venueName,key);
        assert.equal(result.lead.contacts[0].name,input.contactName,key);
        assert.equal(result.lead.contacts[0].email,input.contactEmail,key);
        assert.equal(result.lead.notes,input.message,key);
        assert.deepEqual(result.warnings,[],key);
    }
});
