class CoroutineNode {
    listPrevious: CoroutineNode;
    listNext: CoroutineNode;
    fiber: Generator;
    waitForCoroutine: CoroutineNode;
    yieldObject: IYieldWrapper;
    finished: boolean;
    constructor(fiber: Generator) {
        this.fiber = fiber;
    }
}

interface IYieldWrapper {
    readonly finished: boolean;
}

class CoroutineScheduler {
    public first: CoroutineNode;

    UpdateAllCoroutines() {
        let coroutine = this.first;
        while (coroutine) {
            const listNext = coroutine.listNext;
            // 判断 waitForCoroutine 是否存在,存在而且未结束就什么也不做. 结束就置为空.
            if (coroutine.waitForCoroutine && coroutine.waitForCoroutine.finished) {
                coroutine.waitForCoroutine = null;
                this.UpdateCoroutine(coroutine);
            }
            // 判断 yieldObject
            else if (coroutine.yieldObject && coroutine.yieldObject.finished) {
                coroutine.yieldObject = null;
                this.UpdateCoroutine(coroutine);
            }
            // 如果不存在waitForCoroutine 也不存在 yieldObject, 就执行自己的next
            else if (!coroutine.waitForCoroutine && !coroutine.yieldObject) {
                this.UpdateCoroutine(coroutine);
            }
            coroutine = listNext;
        }
    }

    UpdateCoroutine(coroutine: CoroutineNode) {
        const iteratorResult = coroutine.fiber.next();
        if (!iteratorResult.done) {
            const yieldCommand = iteratorResult.value;
            // if another coroutine
            if (yieldCommand instanceof CoroutineNode) {
                coroutine.waitForCoroutine = yieldCommand;
            }
            // IYieldWrapper
            else if (yieldCommand && yieldCommand.finished) {
                coroutine.yieldObject = yieldCommand;
            }
        } else {
            coroutine.finished = true;
            this.RemoveCoroutine(coroutine);
        }
    }

    AddCoroutine(coroutine: CoroutineNode) {
        if (this.first != null) {
            coroutine.listNext = this.first;
            this.first.listPrevious = coroutine;
        }
        this.first = coroutine;
    }

    RemoveCoroutine(coroutine: CoroutineNode) {
        if (this.first === coroutine) { // remove first
            this.first = coroutine.listNext;
        } else { // not head of list
            if (coroutine.listNext) { // remove between
                coroutine.listPrevious.listNext = coroutine.listNext;
                coroutine.listNext.listPrevious = coroutine.listPrevious;
            } else if (coroutine.listPrevious) { // and listNext is null
                coroutine.listPrevious.listNext = null; // remove last
            }
        }
        coroutine.listPrevious = null;
        coroutine.listNext = null;
    }

    StartCoroutine(fiber: Generator) {
        // if function does not have a yield, fiber will be null and we no-op
        if (fiber == null) { return null; }
        // create coroutine node and run until we reach first yield
        const coroutine = new CoroutineNode(fiber);
        this.AddCoroutine(coroutine);
        return coroutine;
    }

    StopAllCoroutine() {
        this.first = null;
    }
}

function* WaitForSecond(second: number) {
    let time = Date.now();
    while (Date.now() - time < second) yield 1;
}

// 牛B了
class YieldWaitForSecond implements IYieldWrapper {
    get finished(): boolean {
        return Date.now() >= this.reachTime;
    }
    reachTime: number;
    constructor(second: number) {
        this.reachTime = second + Date.now();
    }
}

const coroutineScheduler = new CoroutineScheduler();
const IntervalId = setInterval(() => coroutineScheduler.UpdateAllCoroutines(), 1000 / 30);

function* TimeCoroutine() {
    console.log("test0");
    yield coroutineScheduler.StartCoroutine(WaitForSecond(1000));
    console.log("test1");
    yield new YieldWaitForSecond(1000);
    console.log("test2");
    yield coroutineScheduler.StartCoroutine(SubTimeCoroutine());
    clearInterval(IntervalId);
}

function* SubTimeCoroutine() {
    console.log("sub test 0");
    yield new YieldWaitForSecond(1000);
    console.log("sub test 1");
}

coroutineScheduler.StartCoroutine(TimeCoroutine());


