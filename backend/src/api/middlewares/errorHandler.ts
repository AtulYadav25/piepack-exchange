import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod"

//Handle Error for exceptional cases
export const errorHandler = (err: FastifyError, req: FastifyRequest, reply: FastifyReply) => {
    if (err instanceof ZodError) {

        const formattedErrors = err.issues.map(err => ({
            field: err.path[0],
            message: err.message
        }));

        return reply.code(400).send({
            success: false,
            message: "Validation error",
            error: {
                message: formattedErrors
            }
        })
    }

    //Fastify Validation Error
    if (err && err.code === "FST_ERR_VALIDATION") {

        const formattedErrors = err.validation?.reduce((acc, err) => {
            if (err.message) acc.push(err.message)
            return acc
        }, [] as string[]).join(", ");

        return reply.code(400).send({
            success: false,
            message: "Validation error",
            error: {
                message: formattedErrors
            }
        })
    }

    console.log("SERVER ERROR: ", err);

    return reply.code(500).send({
        success: false,
        message: "Internal server error",
        error: {
            message: err.message
        }
    })
}