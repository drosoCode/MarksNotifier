const puppeteer = require('puppeteer-core');
const cron = require('node-cron');
const fs = require('fs');
const Discord = require('discord.js');

const dataFile = "data.txt";
const config = JSON.parse(fs.readFileSync('config.json'));

const client = new Discord.Client();
client.login(config['discordToken']);

async function getMarks()
{
    const browser = await puppeteer.connect({browserURL: "http://127.0.0.1:9222", defaultViewport: null});
    const page = await browser.newPage();
    
    await page.goto(config['jupyterLogin'], { waitUntil: 'domcontentloaded' });
    if(page.url().indexOf('login') > -1)
    {
        await page.waitForSelector('#username_input');
        await page.evaluate((user, password) => {
            document.querySelector('#username_input').value = user;
            document.querySelector('#password_input').value = password;
            document.querySelector('#login_submit').click();
        }, config['user'], config['password']);
        await page.waitForNavigation({timeout: 8000}).catch(() => {});
        await page.evaluate(() => {
            const start = document.querySelector('#start')
            if(start !== null)
                start.click()
        });
        await page.waitForNavigation({timeout: 8000}).catch(() => {});
    }
    await page.goto(config['jupyterNotebook'], { waitUntil: 'domcontentloaded' });
    await page.waitForNavigation({timeout: 2000}).catch(() => {});
    
    await page.waitForSelector('.cm-s-ipython > div > textarea', { timeout: 2000 }).catch(() => {});
    await page.type('.cm-s-ipython > div > textarea','auth = ("' + config['user'] + '", "' + config['password'] + '")');

    await page.evaluate(() => {document.querySelector('#run_all_cells').childNodes[1].click()});
    
    await page.waitForSelector('.output_html', { timeout: 10000 }).catch(() => {});
    data = await page.evaluate(() => {return document.querySelector('.output_html').innerHTML;});

    await page.evaluate(() => {document.querySelector('#close_and_halt').childNodes[1].click()});
    await page.close();

    return data;
}

function parseHtml(data)
{
    var arr = [];
    var modules = data.split('<td class="titre">');
    modules.shift();
    modules.forEach(el => {
        let title = el.substr(0, el.indexOf('\n'));
        if(title.substr(0, 2) !== '<a')
        {
            let tmp = [];
            let marks = el.split('<span class="note">');
            marks.forEach(e => {
                var pos = e.indexOf('</span>')
                if(pos > -1 && pos < 6)
                    tmp.push(e.substr(0, pos))
            })
            arr.push({'title': title, 'marks': tmp})
        }
    });
    return arr;
}

function compare(oldMarks, newMarks)
{
    let nm = [];
    for(let i = 0; i < oldMarks.length; i++)
        for(let j = 0; j < oldMarks[i]['marks'].length; j++)
            if(oldMarks[i]['marks'][j] != newMarks[i]['marks'][j])
                nm.push({'title': newMarks[i]['title'], 'mark': newMarks[i]['marks'][j]})
    return nm;
}

async function checkMarks()
{
    console.log("Running scan at: " + new Date());
    let newMarks = await getMarks();
    let oldMarks = fs.readFileSync(dataFile).toString();
    try  {
        const cmp = compare(parseHtml(oldMarks), parseHtml(newMarks));
        cmp.forEach(el => {
            if(el['title'] !== undefined && el['mark'] !== undefined)
            {
                console.log('new mark for '+el['title']+': '+el['mark'])
                sendDiscord(el);
            }
        })

        if(cmp.length > 0 || oldMarks == '')
            fs.writeFileSync(dataFile, newMarks);
    }
    catch (e) {
        fs.writeFileSync(dataFile, newMarks);
    }
    console.log('End of scan')
}

function createTable(obj)
{
    function centerSpaces(str, len)
    {
        let l = str.length;
        let left = Math.floor((len - l)/2);
        let right = left + (len - l)%2;
        return ' '.repeat(left) + str + ' '.repeat(right);
    }

    function createLine(obj, lines)
    {
        let l = '';
        for(let i = 0; i < obj.length; i++)
            l += obj[i] + '|'
        for(let i = obj.length; i < lines; i++)
            l += '  /  |'
        return l+'\n';
    }

    let maxTitle = 0;
    let maxMarks = 0;
    obj.forEach(e => {
        if(e['title'].length > maxTitle)
            maxTitle = e['title'].length
        if(e['marks'].length > maxMarks)
            maxMarks = e['marks'].length
    })
    let nbDash = maxTitle + maxMarks*5 + maxMarks+1;

    let table = centerSpaces('Module', maxTitle) + '|' + '  N  |'.repeat(maxMarks) + '\n'
    table += '='.repeat(nbDash)+'\n'
    obj.forEach(e => {
        let arr = [centerSpaces(e['title'], maxTitle)];
        e['marks'].forEach(e => {
            arr.push(centerSpaces(e, 5))
        });
        table += createLine(arr, maxMarks+1)
    })
    return table;
}

function sendDiscord(data) {
    let txt = 'Nouvelle note pour le module __*'+data['title']+'*__: **'+data['mark']+'**';
    client.channels.cache.get(config['discordChannel']).send(txt);
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    if (msg.content === '!check') {
      checkMarks().then(() => {
        msg.channel.send('OK');
      });
    }
    else if (msg.content === '!notes') {
      getMarks().then((val) => {
        msg.channel.send('```'+createTable(parseHtml(val))+'```');
      })
    }
});

cron.schedule(config['crontab'], async () => {checkMarks()});
checkMarks();
