import {statTypes} from "./player.js";
import {abilityData} from "./ability.js";

export default class APLData {
    public simulators:number = 1;
    public mitigation:number = 0;
    public targets:number = 0;
    public debug:boolean = false;
    public simulationTime:number = 300000;
    public slowMotion:boolean = false;
    public autoAttack:boolean = false;

    public mana:number = 0;
    public stats:statTypes = {
        manaregen: 10,
        haste: 0, 
        critical: 0,
        mindamage: 100,
        maxdamage: 150,
        block: 0,
        attackSpeed: 0.1
    }

    public abilityList:Array<any> = [];
    public abilityQueue:Array<number> = [];

    constructor(data:string) {
        this._readData(data);
    }

    private _readData(data:string) {
        let lastPropertyIndex:number = 0;
        let properties:Array<string> = [];
        let result:string = "";
        let line:number = 1;

        let isResulting:boolean = false;
        let isIgnoring:boolean = false;
        let isNegated:boolean = false;

        for (let i = 0; i < data.length; i++) {
            /** comment line */
            if (data[i] === "#")
                isIgnoring = true;

            if (isResulting && data[i] !== "\n" && !isIgnoring) 
                result = result ? result + data[i] : data[i];

            if (data[i] === "\n" || i + 1 == data.length) {
                if (properties.length > 0)
                    this._onEndLine(properties, result.trim(), isNegated, line);
    
                lastPropertyIndex = i+1;
                line++;
                result = "";
                isResulting = false;
                isIgnoring = false;
                isNegated = false;
                properties.splice(0, properties.length);
            }

            if (isIgnoring)
                continue;
    
            if (data[i] === "." && !isResulting) {
                properties.push(data.slice(lastPropertyIndex, i));
                lastPropertyIndex = i+1;
            }

            if (data[i] === "!" && !isResulting) {
                properties.push(data.slice(lastPropertyIndex, i));
                lastPropertyIndex = i+1;
                isNegated = true;
            }
    
            if (data[i] === "=" && !isResulting) {
                properties.push(data.slice(lastPropertyIndex, i));
                lastPropertyIndex = i+1;
                isResulting = true;
            }
        }
    }

    private _abilityObject:abilityData = { id:0, rank:0, condition: {}, once:false };
    private _onEndLine(properties:Array<string>, result:any, isNegated:boolean, line:number):void {
        let base:string = properties[0];
        let props:string = properties[1];

        if (base === "stats") {
            if (props in this.stats)
            {
                this.stats[props] = Number(result);
                return;
            }
            else
                throw new Error(`APL Syntax error at line ${line} - stats.${props} does not exist`);
        }

        if (base === "debug") {
            this.debug = Number(result) > 0 ? true : false;
            return;
        }

        if (base === "mana") {
            this.mana = Number(result) > 0 ? Number(result) : 100;
            return;
        }

        if (base === "simulators") {
            this.simulators = Number(result) > 0 && Number(result) <= 10000 ? Number(result) : 1;
            return;
        }

        if (base === "mitigation") {
            this.mitigation = Number(result) > 0 ? Number(result) : 0;
            return;
        }

        if (base === "targets") {
            this.targets = Number(result) > 0 && Number(result) <= 20 ? Number(result) : 1;
            return;
        }

        if (base === "simulationtime") {
            this.simulationTime = Number(result) > 0 ? Number(result) : 60000;
            return;
        }

        if (base === "slowmotion") {
            this.slowMotion = Number(result) > 0 ? true : false;
            return;
        }

        if (base === "autoattack") {
            this.autoAttack = Number(result) > 0 ? true : false;
            return;
        }

        if (base === "ability" || base === "item") {
            if (result === "push()") {
                this.abilityList.push(this._abilityObject);
                this._abilityObject = { id:0, rank:0, condition: {}, once:false };
                return;
            }

            switch (props) {
                case "condition":
                    if (properties[2] === "aura") {
                        if (this._abilityObject.condition.aura)
                            this._abilityObject.condition.aura.push({ value: Number(result), negated: Boolean(isNegated) });
                        else
                            this._abilityObject.condition[properties[2]] = [{ value: Number(result), negated: Boolean(isNegated) }];
                    }
                    else
                        this._abilityObject.condition[properties[2]] = { value: Number(result), negated: Boolean(isNegated) };
                    return;
                default: 
                    this._abilityObject[props] = Number(result);
                    return;
            }
        }

        if (base === "abilityQue") {
            if (props === "add") {
                this.abilityQueue.push(Number(result));
                return;
            }
            else
                throw new Error(`APL Syntax error at line ${line} - abilityQue.${props} does not exist`);
        }
        throw new Error(`APL Syntax error at line ${line} - Invalid data ${properties}`);
    }
}