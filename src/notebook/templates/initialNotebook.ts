/**
 * Default template content for new AgentWorkbook notebooks
 */

/**
 * Initial Python code template for new notebooks
 */
export const INITIAL_NOTEBOOK_CODE = `import agentworkbook as awb

last_successful_commit = (await awb.execute_shell("git symbolic-ref --short HEAD || git rev-parse HEAD")).stdout.strip()
if (await awb.execute_shell("[[ $(git ls-files --others --modified --killed --directory | head -c1 | wc -c) -eq 0 ]]")).exitCode != 0:
    raise Exception("Working directory is not clean")

@awb.onstart
async def onstart(task):
    return f"git checkout -b awb-task-{task.id}"

@awb.oncomplete
def oncomplete(task):
    global last_successful_commit
    last_successful_commit = f"awb-task-{task.id}"
    return f"git add -A; git diff-index --quiet HEAD || git commit --no-gpg-sign -m 'Task {task.id} completed'"

@awb.onpause
def onpause(task):
    return f"git add -A; git diff-index --quiet HEAD || git commit --no-gpg-sign -m 'Task {task.id} paused'; git checkout {last_successful_commit}"

@awb.onresume
def onresume(task):
    return f"git checkout awb-task-{task.id}"

awb.live_preview()`;

/**
 * Default markdown header for new notebooks
 */
export const DEFAULT_NOTEBOOK_HEADER = '# AgentWorkbook Notebook\n\nUse this notebook to interact with AgentWorkbook.\nPlease, remember to set proper working directory below.';

/**
 * Example task creation code
 */
export const EXAMPLE_TASK_CODE = 'tasks = awb.submit_tasks([f"Write {func} function in Javascript" for func in ["Fibbonacii", "Factorial", "FizzBuzz"]], mode="code")';