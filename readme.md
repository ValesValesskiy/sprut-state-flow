# State-flow

Инструмент для пошагового контроля процесса, составления карты переходов и контроля жизненного цикла каждого состояния.
Работа со state-flow представляет собой создание состояний с подробными описанием и управлением переходов между ними.

## Конфигурация состояний:
```js
const states = {
    begin: {
        income: () => { /* Обработчик, выполняющийся при каждом приходе к состоянию */ },
        outcome: () => { /* Обработчик, выполняющийся при каждом покидании состояния */ },
        transitions: [ 'middle' ], /* Имена состояний, возможных для переходов. Можно отключить, например, для не dev-режима во избежании лишних проверок */
        events: { /* Регистрация действий, которые могут совершаться внутри данного состояния как события */
            next: {
                handler: (resolve, error, flowData, ...args) => { /* resolve - активация перехода в новое состояние, error - добавление flow-ошибки для обработчика ошибок, аргументы - фукнция перехода состояния resolve, списки ошибок, накопленная flowData, аргументы метода event() */
                    resolve('middle')
                }
            }
        }
    },
    middle: {
        transitions: [ 'final' ],
        events: {
            next: {
                handler: (resolve, error, flowData) => {
                    error('Some error');
                    resolve('final')
                }
            }
        }
    },
    final: {
        income: () => {}
    }
}
```

## Объект инифиализации:
```js
const props = {
    states, /* Созданная выше конфигурация состояний */
    initialState: 'begin', /* Начальное состояние */
    finalState: 'final', /* Конечное состояние */
    initial: (...args) => { console.log('Initial handler arguments: ', ...args) }, /* Обработчик инициализации flow, аргументы - накопленная(базовая) flowData, аргументы метода .start() */
    final: (...args) => { console.log('Final handler arguments: ', ...args, '\nFlow is completed') }, /* Обработчик завершения flow, аргументы - накопленный объект flowData */
    initialData: {
        data: true
    }, /* Объект данных, прокидываемый в обработчики, мутируемый, пустой объект по умолчанию */
    maxPendingMillisecondsTime: 10000, /* Количество миллисекунд ожидаемое до завершения обработки события, по истечение которого генерируется flow-ошибка, если не задан, время неограничено */
    changeStateListener: (...args) => { console.log('Change state listener arguments: ', ...args); }, /* Обработчик изменения состояния */
    errorListener: (...args) => { console.log('Error listener arguments: ', ...args); }, /* Обработчик ошибок, вызывается каждый раз после обработчика изменения состояния, если оно было изменено */
    isCheckStateTransitions: false /* Включение или отключение проверки валидности перехода при вызове resolve из обработчика события состояния, по умолчанию - true */
};
```

## Инициализация и старт:
```js
const { Flow } = require('state-flow');
const flow = new Flow(props);

flow.start();
flow.event('next');
```

## Интерфейс класса Flow:
```js
start(...args: any[]): void /* Инициализация flow */
event(eventName: string | number | symbol, ...args: any[]): void /* Событие состояния */
stop(): void /* Остановка flow с задействованием финального обработчика */
isValidTransition(state: string): boolean /* Проверка, является ли стейт валидным для перехода на него с нынешнего стейта */
get maxPendingMillisecondsTime(): number | null /* Время ожидания обработки события состояния до ошибки */
get isPending(): boolean /* Булево флаг ожидания обработки события состояния(до ошибки или окончания обработки) */
get isResolved(): boolean /* Инверсия isPendingб обработка события закончена */
get inProgress(): boolean /* Булево флаг работы flow(true - если flow запущен и не завершён) */
get states(): string[] /* Список всех состояний flow */
get currentState(): string /* Имя состояния, в котором находится flow */
get possibleTransitions(): string[] /* Список имён состояний, возможных для перехода в нынешнем состоянии flow */
```

## Интерфейс объекта ошибок:
```js
{
    flow: string[]; /* Ошибки, генерируемые Flow-классом или добавляемые обработчиком, аналог бизнес-ошибок */
    system: string[]; /* Ошибки, отлавлиемые с помощью catch(systemError) */
}
```